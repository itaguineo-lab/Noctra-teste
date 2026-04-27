require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const http = require('http');

const {
    connectToMongo,
    getPlayer,
    createPlayer
} = require('./src/core/player/playerService');

const { getMainMenuText, buildMainMenuText, getPlayerSafe } = require('./src/utils/helpers');
const { mainMenu } = require('./src/menus/mainMenu');
const { navigateScreen, tryDeleteCurrentMessage } = require('./src/utils/uiNavigator');
const assets = require('./src/data/assets');

/*
FIX: banCacheService substitui getPlayer() completo no middleware anti-ban.
Agora cada interação faz uma busca leve (só o campo `banned`) com cache
de 5 minutos, reduzindo drasticamente as queries ao MongoDB.
*/
const { isBanned, purgeBanCache } = require('./src/services/banCacheService');

/*
=================================
IMPORTS HANDLERS
=================================
*/

const profile = require('./src/handlers/profile');
const inventory = require('./src/handlers/inventoryV3');
const combat = require('./src/handlers/combat');
const travel = require('./src/handlers/travel');
const energy = require('./src/handlers/energy');
const vip = require('./src/handlers/vip');
const daily = require('./src/handlers/daily');
const online = require('./src/handlers/online');
const ranking = require('./src/handlers/ranking');
const dungeon = require('./src/handlers/dungeon');
const shop = require('./src/handlers/shop');
const arena = require('./src/handlers/arena');
const arenaShop = require('./src/handlers/arenaShop');

/*
=================================
IMPORTS COMMANDS
=================================
*/

const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const { handleEquip, handleEquipSoulCommand } = require('./src/commands/equip');
const resetCommands = require('./src/commands/reset');
const adminCommands = require('./src/commands/admin');

function validateEnv() {
    const hasBotToken = Boolean(process.env.BOT_TOKEN);
    const hasMongo = Boolean(process.env.MONGODB_URI || process.env.MONGO_URI);

    const missing = [];
    if (!hasBotToken) missing.push('BOT_TOKEN');
    if (!hasMongo) missing.push('MONGODB_URI/MONGO_URI');

    if (missing.length) {
        throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
    }
}

validateEnv();

const bot = new Telegraf(process.env.BOT_TOKEN);

let handlersRegistered = false;
let botStarted = false;
let shuttingDown = false;

const creationSessions = new Map();

/*
=================================
HELPERS
=================================
*/

function isValidName(name) {
    const trimmed = String(name || '').trim();
    return trimmed.length >= 3 && trimmed.length <= 20;
}

function bindCommand(name, handler) {
    if (typeof handler !== 'function') {
        console.log(`⚠️ Handler ausente para /${name}`);
        return;
    }

    bot.command(name, handler);
}

function bindAction(pattern, handler) {
    if (typeof handler !== 'function') {
        console.log(`⚠️ Handler ausente para action: ${pattern}`);
        return;
    }

    bot.action(pattern, handler);
}

async function sendMainMenu(ctx, userId, username, editMode = false) {
    const player = await getPlayerSafe(userId);
    const menuText = player
        ? buildMainMenuText(player, username)
        : await getMainMenuText(userId, username);
    const mapImage = player?.currentMap ? assets?.maps?.[player.currentMap] : null;
    const keyboard = mainMenu();

    if (!editMode) {
        return navigateScreen(ctx, {
            text: menuText,
            media: mapImage || null,
            options: keyboard
        });
    }

    try {
        return await navigateScreen(ctx, {
            text: menuText,
            media: mapImage || null,
            options: keyboard
        });
    } catch {
        await tryDeleteCurrentMessage(ctx);
        return navigateScreen(ctx, {
            text: menuText,
            media: mapImage || null,
            options: keyboard
        });
    }
}

/*
=================================
CHARACTER CREATION
=================================
*/

async function finalizeCharacterCreation(ctx, userId, name, className) {
    let player = null;

    try {
        player = await createPlayer(userId, name, className);
    } catch (error) {
        console.error('Erro ao criar personagem:', error);

        try {
            player = await getPlayer(userId);
        } catch (recoveryError) {
            console.error('Erro ao recuperar personagem após falha:', recoveryError);
        }

        if (!player) {
            creationSessions.delete(userId);
            await ctx.reply('❌ Ocorreu um erro ao criar seu personagem. Tente novamente com /start.');
            return;
        }
    }

    creationSessions.delete(userId);

    try {
        await ctx.reply(`✨ Personagem criado com sucesso! Bem-vindo a Noctra, *${player.name}*!`, {
            parse_mode: 'Markdown'
        });
    } catch (replyError) {
        console.error('Erro ao responder criação de personagem:', replyError);
    }

    try {
        await sendMainMenu(ctx, userId, player.name, false);
    } catch (menuError) {
        console.error('Erro ao enviar menu após criação:', menuError);
        try {
            await ctx.reply('✅ Personagem criado. Use /start se o menu não aparecer.');
        } catch {
            // ignora
        }
    }
}

/*
=================================
MIDDLEWARES
=================================
*/

function registerCreationMiddleware() {
    bot.use(async (ctx, next) => {
        if (!ctx.message || !ctx.message.text) return next();

        const userId = String(ctx.from.id);
        const session = creationSessions.get(userId);

        if (!session) return next();

        if (session.step === 'awaiting_name') {
            const rawName = ctx.message.text.trim();

            if (!isValidName(rawName)) {
                return ctx.reply('❌ O nome deve ter entre *3 e 20 caracteres*. Tente novamente:', {
                    parse_mode: 'Markdown'
                });
            }

            session.name = rawName;
            session.step = 'awaiting_class';
            creationSessions.set(userId, session);

            const classKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('⚔️ Guerreiro', 'choose_class_guerreiro')],
                [Markup.button.callback('🏹 Arqueiro', 'choose_class_arqueiro')],
                [Markup.button.callback('🔮 Mago', 'choose_class_mago')]
            ]);

            return ctx.reply(`Ótimo, *${rawName}*! Agora escolha sua classe:`, {
                parse_mode: 'Markdown',
                ...classKeyboard
            });
        }

        if (session.step === 'awaiting_class') {
            return ctx.reply('Por favor, escolha uma classe usando os botões acima.');
        }

        return next();
    });
}

function registerAntiBanMiddleware() {
    /*
    FIX: versão original chamava getPlayer() completo em TODA interação.
    Agora usa banCacheService.isBanned() que:
    - Faz busca leve no MongoDB (só campo `banned`)
    - Cacheia o resultado por 5 minutos por userId
    - Em caso de erro de DB, deixa passar (fail-open) para não
      bloquear jogadores legítimos por instabilidade de conexão.
    
    Lembrete: ao banir ou desbanir um jogador via admin,
    chamar invalidateBanCache(userId) para atualização imediata.
    */
    bot.use(async (ctx, next) => {
        if (!ctx.from) return next();

        try {
            if (await isBanned(ctx.from.id)) {
                return ctx.reply('⛔ Você está banido do Noctra.');
            }
        } catch {
            // fail-open: erro no cache não bloqueia jogadores
        }

        return next();
    });
}

function registerGlobalErrorHandler() {
    bot.catch((err, ctx) => {
        console.error('❌ ERRO GLOBAL:', err);

        if (ctx?.reply) {
            ctx.reply('⚠️ Algo deu errado no mundo de Noctra.').catch(() => {});
        }
    });
}

/*
=================================
START / CRIAÇÃO
=================================
*/

function registerStartFlow() {
    bot.start(async (ctx) => {
        const userId = String(ctx.from.id);
        const firstName = ctx.from.first_name;

        let player;
        try {
            player = await getPlayer(userId);
        } catch {
            player = null;
        }

        if (player) {
            return sendMainMenu(ctx, userId, firstName, false);
        }

        creationSessions.set(userId, { step: 'awaiting_name' });

        await ctx.reply(
            `🌑 *Bem-vindo a Noctra!*\n\n` +
            `Você é um Caçador da Noite, destinado a enfrentar a escuridão.\n\n` +
            `Para começar, diga-me: *qual é o seu nome?*`,
            { parse_mode: 'Markdown' }
        );
    });

    bindAction(/choose_class_(.+)/, async (ctx) => {
        const userId = String(ctx.from.id);
        const session = creationSessions.get(userId);

        if (!session || session.step !== 'awaiting_class') {
            return ctx.answerCbQuery('Sessão expirada. Use /start novamente.');
        }

        const className = ctx.match[1];
        const allowed = ['guerreiro', 'arqueiro', 'mago'];

        if (!allowed.includes(className)) {
            return ctx.answerCbQuery('Classe inválida.');
        }

        await ctx.answerCbQuery();
        await finalizeCharacterCreation(ctx, userId, session.name, className);
    });
}

/*
=================================
COMMANDS
=================================
*/

function registerCommands() {
    bindCommand('profile', profile.handleProfile);
    bindCommand('inventory', inventory.handleInventory);
    bindCommand('energy', energy.handleEnergy);
    bindCommand('travel', travel.handleTravel);
    bindCommand('shop', shop.handleShop);
    bindCommand('daily', daily.handleDaily);
    bindCommand('vip', vip.handleVip);
    bindCommand('online', online.handleOnline);
    bindCommand('ranking', ranking.handleRanking);
    bindCommand('arena', arena.handleArena);

    bindCommand('rename', handleRename);
    bindCommand('class', handleClass);
    bindCommand('equip', handleEquip);
    bindCommand('equipsoul', handleEquipSoulCommand);

    bindCommand('reset', resetCommands.handleReset);
    bindCommand('resetplayer', resetCommands.handleResetPlayer);
    bindCommand('resetall', resetCommands.handleResetAll);

    bindCommand('adminhelp', adminCommands.handleAdminHelp);
    bindCommand('myid', adminCommands.handleMyId);
    bindCommand('id', adminCommands.handleId);
    bindCommand('findplayer', adminCommands.handleFindPlayer);
    bindCommand('findplayername', adminCommands.handleFindPlayerName);
    bindCommand('playerstate', adminCommands.handlePlayerState);
    bindCommand('setplayer', adminCommands.handleSetPlayer);
    bindCommand('capture', adminCommands.handleCapture);
    bindCommand('heal', adminCommands.handleHeal);
    bindCommand('teleport', adminCommands.handleTeleport);
    bindCommand('playerfix', adminCommands.handlePlayerFix);

    bindCommand('give', (ctx) => {
        const subCommand = ctx.message.text.split(' ')[1]?.toLowerCase();
        if (subCommand === 'xp') return adminCommands.handleGiveXp(ctx);
        if (subCommand === 'gold') return adminCommands.handleGiveGold(ctx);
        if (subCommand === 'nox') return adminCommands.handleGiveNox(ctx);
        if (subCommand === 'keys') return adminCommands.handleGiveKeys(ctx);
        if (subCommand === 'glorias') return adminCommands.handleGiveGlorias(ctx);
        if (subCommand === 'item') return adminCommands.handleGiveItem(ctx);
        if (subCommand === 'soul') return adminCommands.handleGiveSoul(ctx);

        return ctx.reply(
            '📝 Uso: /give [xp|gold|nox|keys|glorias|item|soul] ID_ou_nome <quantidade|soul_id>\nTambém funciona respondendo a mensagem do jogador.'
        );
    });

    bindCommand('ban', adminCommands.handleBan);
    bindCommand('unban', adminCommands.handleUnban);
    bindCommand('reload', adminCommands.handleReload);
    bindCommand('metrics', adminCommands.handleMetrics);
}

/*
=================================
STATIC ACTIONS
=================================
*/

function registerStaticActions() {
    bindAction('rename_help', async (ctx) => {
        await ctx.answerCbQuery('Use /rename novo_nome', { show_alert: true });
    });

    bindAction('class_help', async (ctx) => {
        await ctx.answerCbQuery('Use /class guerreiro | arqueiro | mago', { show_alert: true });
    });

    bindAction('menu', async (ctx) => {
        await ctx.answerCbQuery();
        return sendMainMenu(ctx, ctx.from.id, ctx.from.first_name, true);
    });
}

/*
=================================
MAIN MENU ACTIONS
=================================
*/

function registerMainMenuActions() {
    bindAction('profile', profile.handleProfile);
    bindAction('inventory', inventory.handleInventory);
    bindAction('energy', energy.handleEnergy);
    bindAction('travel', travel.handleTravel);
    bindAction('shop', shop.handleShop);
    bindAction('daily', daily.handleDaily);
    bindAction('vip', vip.handleVip);
    bindAction('online', online.handleOnline);
    bindAction('ranking', ranking.handleRanking);
    bindAction('hunt', combat.handleHunt);
    bindAction('dungeon', dungeon.handleDungeon);
    bindAction('arena', arena.handleArena);
}

/*
=================================
DAILY ACTIONS
=================================
*/

function registerDailyActions() {
    bindAction('daily_chest', daily.handleDailyChest);
    bindAction('daily_claim_missions', daily.handleClaimMissionRewards);
    bindAction('daily_chests', daily.handleTimedChests);
    bindAction(/^daily_open_chest:(.+)$/, daily.handleOpenTimedChest);
}

/*
=================================
ARENA ACTIONS
=================================
*/

function registerArenaActions() {
    bindAction('arena_fight', arena.handleArenaFight);
    bindAction('arena_attack', arena.handleArenaAttack);
    bindAction('arena_defend', arena.handleArenaDefend);
    bindAction('arena_flee', arena.handleArenaFlee);
    bindAction('arena_consumables', arena.handleArenaConsumables);
    bindAction(/^arena_use:(potionHp|potionEnergy|tonicStrength|tonicDefense)$/, arena.handleArenaUseConsumable);
    bindAction('arena_chests', arena.handleArenaChests);
    bindAction(/^arena_open_chest:(.+)$/, arena.handleArenaOpenChest);
    bindAction('arena_ranking', arena.handleArenaRanking);

    bindAction('arena_shop', arenaShop.handleArenaShop);
    bindAction(/^arena_shop_buy:(.+)$/, arenaShop.handleArenaShopBuy);
}

/*
=================================
COMBAT ACTIONS
=================================
*/

function registerCombatActions() {
    bindAction('combat_attack', combat.handleAttack);
    bindAction('combat_defend', combat.handleDefend);
    bindAction(/combat_soul_([01])/, combat.handleSoul);
    bindAction('combat_soul_menu', combat.handleSoulMenu);
    bindAction('combat_consumables', combat.handleConsumables);
    bindAction(/^combat_use:(potionHp|potionEnergy|tonicStrength|tonicDefense)$/, combat.handleUseConsumable);
    bindAction(/^combat_loot:(.+)$/, combat.handleViewDroppedLoot);
    bindAction(/^combat_loot_equip:(.+)$/, combat.handleEquipDroppedLoot);
    bindAction('combat_flee', combat.handleFlee);
    bindAction('combat_back', combat.handleCombatBack);
}

/*
=================================
INVENTORY ACTIONS
=================================
*/

function registerInventoryActions() {
    bindAction(/^invcat:(.+)$/, inventory.handleInventoryCategory);
    bindAction(/^invpage:(.+):(\d+)$/, inventory.handleInventoryPage);

    bindAction(/^eqp:(.+):(\d+):(\d+)$/, inventory.handleEquipItem);
    bindAction(/^eqid:(.+):(\d+):(.+)$/, inventory.handleEquipItem);
    bindAction(/^eq:(.+):(\d+):(\d+)$/, inventory.handleEquipItem);
    bindAction(/^uneq:(.+):(.+):(\d+)$/, inventory.handleUnequipItem);

    bindAction(/^equip_soul_(.+)$/, inventory.handleEquipSoul);
    bindAction(/^unequip_soul_(\d+)$/, inventory.handleUnequipSoul);
    bindAction(/^invskin:equip:(.+)$/, inventory.handleEquipSkin);
    bindAction(/^invskin:unequip:(title|aura|badge)$/, inventory.handleUnequipSkin);

    bindAction('use_potion_outside_hp', (ctx) => inventory.handleUsePotionOutside(ctx, 'hp'));
    bindAction('use_tonic_strength', inventory.handleUseStrengthTonic);
    bindAction('use_tonic_defense', inventory.handleUseDefenseTonic);
}

/*
=================================
SHOP ACTIONS
=================================
*/

function registerShopActions() {
    bindAction('shop_buy_menu', shop.handleShopBuyMenu);
    bindAction('shop_sell', shop.handleShopSell);
    bindAction(/^shop_sell_page_(\d+)$/, shop.handleShopSellPage);
    bindAction(/^sell_confirm_key_(.+)$/, shop.handleSellConfirmByKey);
    bindAction(/sell_confirm_(.+)/, shop.handleSellConfirm);

    bindAction('shop_village', shop.handleShopVillage);
    bindAction('shop_castle', shop.handleShopCastle);
    bindAction('shop_arena', shop.handleShopArena);

    bindAction(/^shop_buyqty:(.+):(\d+)$/, shop.handleBuyQuantity);
    bindAction(/^shop_backtab:(.+)$/, shop.handleShopBackTab);

    bindAction(/^buy_(.+)$/, shop.handleBuy);
}

/*
=================================
TRAVEL / DUNGEON / ENERGY ACTIONS
=================================
*/

function registerTravelAndDungeonActions() {
    bindAction(/travel_to_(.+)/, travel.handleTravelTo);
    bindAction('travel_locked', travel.handleTravelLocked);

    bindAction('dungeon_start', dungeon.handleDungeonStart);
    bindAction('dungeon_attack', dungeon.handleDungeonAttack);
    bindAction('dungeon_next_room', dungeon.handleDungeonNextRoom);
    bindAction('dungeon_flee', dungeon.handleDungeonFlee);
    bindAction('dungeon_soul_menu', dungeon.handleDungeonSoulMenu);
    bindAction('dungeon_consumables', dungeon.handleDungeonConsumables);
    bindAction(/^dungeon_use:(potionHp|potionEnergy|tonicStrength|tonicDefense)$/, dungeon.handleDungeonUseConsumable);

    bindAction('reset_confirm', resetCommands.handleResetConfirm);
    bindAction('reset_cancel', resetCommands.handleResetCancel);

    bindAction('rest_energy', energy.handleRestEnergy);
}

/*
=================================
PHOTO CAPTURE
=================================
*/

function registerPhotoCapture() {
    if (typeof adminCommands.handleCapturePhoto === 'function') {
        bot.on('photo', adminCommands.handleCapturePhoto);
    }
}

/*
=================================
BOT REGISTRATION
=================================
*/

function registerBot() {
    if (handlersRegistered) return;
    handlersRegistered = true;

    registerPhotoCapture();

    registerCreationMiddleware();
    registerAntiBanMiddleware();
    registerGlobalErrorHandler();

    registerStartFlow();
    registerCommands();
    registerStaticActions();

    registerMainMenuActions();
    registerDailyActions();
    registerArenaActions();
    registerCombatActions();
    registerInventoryActions();
    registerShopActions();
    registerTravelAndDungeonActions();
}

/*
=================================
BOT STARTUP
=================================
*/

async function startBot() {
    if (botStarted) {
        console.log('ℹ️ Bot já está em execução.');
        return;
    }

    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook removido');

        await connectToMongo();
        console.log('✅ MongoDB conectado');

        await bot.launch({ dropPendingUpdates: true });
        botStarted = true;

        console.log('🌑 NOCTRA ONLINE');
    } catch (err) {
        botStarted = false;

        if (err?.response?.error_code === 409) {
            console.error('⚠️ Conflito temporário de polling (409). Outra instância ainda está encerrando.');
            return;
        }

        console.error('❌ Erro ao iniciar bot:', err);
    }
}

/*
=================================
HTTP SERVER
=================================
*/

function startHttpServer() {
    const PORT = process.env.PORT || 3000;

    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Noctra online');
    }).listen(PORT, () => {
        console.log(`🌐 Porta ${PORT}`);
    });
}

/*
=================================
LIMPEZA PERIÓDICA DO BAN CACHE
Executa a cada 30 minutos para remover entradas expiradas.
=================================
*/

function startBanCachePurge() {
    setInterval(() => {
        purgeBanCache();
    }, 30 * 60 * 1000);
}

/*
=================================
SHUTDOWN
=================================
*/

async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`🛑 Recebido ${signal}. Encerrando aplicação...`);

    try {
        if (botStarted) {
            await bot.stop(signal);
            console.log('✅ Bot finalizado com sucesso');
        } else {
            console.log('ℹ️ Bot não estava em execução, encerrando sem stop');
        }
    } catch (error) {
        console.error('❌ Erro ao encerrar bot:', error);
    } finally {
        process.exit(0);
    }
}

/*
=================================
START
=================================
*/

registerBot();
startHttpServer();
startBanCachePurge();
startBot();

process.once('SIGINT', () => {
    gracefulShutdown('SIGINT');
});

process.once('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
});
