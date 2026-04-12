require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const http = require('http');

const { connectToMongo, getPlayer, createPlayer } = require('./src/core/player/playerService');
const { getMainMenuText } = require('./src/utils/helpers');
const { mainMenu } = require('./src/menus/mainMenu');

/*
=================================
IMPORTS HANDLERS
=================================
*/

const profile = require('./src/handlers/profile');
const inventory = require('./src/handlers/inventory');
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

const bot = new Telegraf(process.env.BOT_TOKEN);

let launched = false;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

// ================================================
// CENA DE CRIAÇÃO DE PERSONAGEM
// ================================================

// Armazena sessões de criação: userId -> { step: 'awaiting_name' | 'awaiting_class', name: string }
const creationSessions = new Map();

// Validação de nome
function isValidName(name) {
    const trimmed = name.trim();
    return trimmed.length >= 3 && trimmed.length <= 20;
}

// Middleware para capturar mensagens de texto durante a criação
bot.use(async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();

    const userId = String(ctx.from.id);
    const session = creationSessions.get(userId);

    if (!session) return next();

    // Se estiver aguardando o nome
    if (session.step === 'awaiting_name') {
        const rawName = ctx.message.text.trim();
        if (!isValidName(rawName)) {
            return ctx.reply('❌ O nome deve ter entre *3 e 20 caracteres*. Tente novamente:', { parse_mode: 'Markdown' });
        }

        // Salva o nome e avança para escolha da classe
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

    // Se estiver aguardando classe, mas enviou texto em vez de clicar no botão
    if (session.step === 'awaiting_class') {
        return ctx.reply('Por favor, escolha uma classe usando os botões acima.');
    }

    return next();
});

// Finaliza a criação e exibe o menu principal
async function finalizeCharacterCreation(ctx, userId, name, className) {
    try {
        // Cria o jogador no banco
        const player = await createPlayer(userId, name, className);
        creationSessions.delete(userId);

        await ctx.reply(`✨ Personagem criado com sucesso! Bem-vindo a Noctra, *${name}*!`);
        
        // Exibe o menu principal
        const menuText = await getMainMenuText(userId, name);
        await ctx.reply(menuText, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    } catch (error) {
        console.error('Erro ao criar personagem:', error);
        await ctx.reply('❌ Ocorreu um erro ao criar seu personagem. Tente novamente com /start.');
        creationSessions.delete(userId);
    }
}

// ================================================
// MIDDLEWARE ANTI-BAN
// ================================================

bot.use(async (ctx, next) => {
    if (ctx.from) {
        try {
            const player = await getPlayer(ctx.from.id);
            if (player && player.banned) {
                return ctx.reply('⛔ Você está banido do Noctra.');
            }
        } catch (err) {
            // Se o jogador não existir, permite continuar (será criado no /start)
        }
    }
    return next();
});

/*
=================================
ERROR HANDLER GLOBAL
=================================
*/

bot.catch((err, ctx) => {
    console.error('❌ ERRO GLOBAL:', err);

    if (ctx?.reply) {
        ctx.reply('⚠️ Algo deu errado no mundo de Noctra.');
    }
});

/*
=================================
HELPERS
=================================
*/

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

/*
=================================
BOT STARTUP
=================================
*/

async function startBot() {
    if (launched) return;
    launched = true;

    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook removido');
        await sleep(3000);
        await connectToMongo();
        console.log('✅ MongoDB conectado');
        await bot.launch({ dropPendingUpdates: true });
        console.log('🌑 NOCTRA ONLINE');
    } catch (err) {
        console.error('❌ Erro ao iniciar bot:', err);
    }
}

/*
=================================
START (COM CENA DE CRIAÇÃO)
=================================
*/

bot.start(async (ctx) => {
    const userId = String(ctx.from.id);
    const firstName = ctx.from.first_name;

    let player;
    try {
        player = await getPlayer(userId);
    } catch (e) {
        player = null;
    }

    if (player) {
        // Jogador existente: menu normal
        const menuText = await getMainMenuText(userId, firstName);
        return ctx.reply(menuText, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    }

    // Jogador novo: inicia cena de criação
    creationSessions.set(userId, { step: 'awaiting_name' });
    await ctx.reply(
        `🌑 *Bem-vindo a Noctra!*\n\n` +
        `Você é um Caçador da Noite, destinado a enfrentar a escuridão.\n\n` +
        `Para começar, diga-me: *qual é o seu nome?*`,
        { parse_mode: 'Markdown' }
    );
});

// Ação para escolha de classe (via botões inline)
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

/*
=================================
COMMANDS
=================================
*/

// Comandos de jogador
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

// Comandos administrativos
bindCommand('give', (ctx) => {
    const subCommand = ctx.message.text.split(' ')[1]?.toLowerCase();
    if (subCommand === 'xp') return adminCommands.handleGiveXp(ctx);
    if (subCommand === 'gold') return adminCommands.handleGiveGold(ctx);
    if (subCommand === 'nox') return adminCommands.handleGiveNox(ctx);
    if (subCommand === 'item') return adminCommands.handleGiveItem(ctx);
    return ctx.reply('📝 Uso: /give [xp|gold|nox|item] @usuario <quantidade/nome>');
});
bindCommand('ban', adminCommands.handleBan);
bindCommand('unban', adminCommands.handleUnban);
bindCommand('reload', adminCommands.handleReload);

/*
=================================
PROFILE HELP
=================================
*/

bindAction('rename_help', async (ctx) => {
    await ctx.answerCbQuery('Use /rename novo_nome', { show_alert: true });
});

bindAction('class_help', async (ctx) => {
    await ctx.answerCbQuery('Use /class guerreiro | arqueiro | mago', { show_alert: true });
});

/*
=================================
MAIN MENU
=================================
*/

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

/*
=================================
ARENA
=================================
*/

bindAction('arena_fight', arena.handleArenaFight);
bindAction('arena_attack', arena.handleArenaAttack);
bindAction('arena_defend', arena.handleArenaDefend);
bindAction('arena_flee', arena.handleArenaFlee);
bindAction('arena_chests', arena.handleArenaChests);
bindAction(/^arena_open_chest:(.+)$/, arena.handleArenaOpenChest);
bindAction('arena_ranking', arena.handleArenaRanking);

bindAction('arena_shop', arenaShop.handleArenaShop);
bindAction(/^arena_shop_buy:(.+)$/, arenaShop.handleArenaShopBuy);

/*
=================================
COMBAT
=================================
*/

bindAction('combat_attack', combat.handleAttack);
bindAction('combat_defend', combat.handleDefend);
bindAction('combat_soul_menu', combat.handleSoulMenu);
bindAction(/combat_soul_([01])/, combat.handleSoul);
bindAction('combat_consumables', combat.handleConsumables);
bindAction('combat_flee', combat.handleFlee);
bindAction('combat_back', combat.handleCombatBack);

/*
=================================
INVENTORY
=================================
*/

bindAction(/^invcat:(.+)$/, inventory.handleInventoryCategory);
bindAction(/^invpage:(.+):(\d+)$/, inventory.handleInventoryPage);
bindAction(/^eq:(.+):(\d+):(\d+)$/, inventory.handleEquipItem);
bindAction(/^uneq:(.+):(.+):(\d+)$/, inventory.handleUnequipItem);

bindAction(/^equip_soul_(.+)$/, inventory.handleEquipSoul);
bindAction(/^unequip_soul_(\d+)$/, inventory.handleUnequipSoul);

bindAction('use_potion_outside_hp', (ctx) => inventory.handleUsePotionOutside(ctx, 'hp'));
bindAction('use_tonic_strength', inventory.handleUseStrengthTonic);
bindAction('use_tonic_defense', inventory.handleUseDefenseTonic);

/*
=================================
SHOP
=================================
*/

bindAction('shop_buy_menu', shop.handleShopBuyMenu);
bindAction('shop_sell', shop.handleShopSell);
bindAction(/sell_confirm_(.+)/, shop.handleSellConfirm);

bindAction('shop_village', shop.handleShopVillage);
bindAction('shop_castle', shop.handleShopCastle);
bindAction('shop_arena', shop.handleShopArena);
bindAction(/buy_(.+)/, shop.handleBuy);

/*
=================================
TRAVEL
=================================
*/

bindAction(/travel_to_(.+)/, travel.handleTravelTo);
bindAction('travel_locked', travel.handleTravelLocked);

/*
=================================
DUNGEON
=================================
*/

bindAction('dungeon_start', dungeon.handleDungeonStart);
bindAction('dungeon_attack', dungeon.handleDungeonAttack);
bindAction('dungeon_next_room', dungeon.handleDungeonNextRoom);
bindAction('dungeon_flee', dungeon.handleDungeonFlee);
bindAction('dungeon_soul_menu', dungeon.handleDungeonSoulMenu);
bindAction('dungeon_consumables', dungeon.handleDungeonConsumables);

/*
=================================
RESET CONFIRMATION ACTIONS
=================================
*/

bindAction('reset_confirm', resetCommands.handleResetConfirm);
bindAction('reset_cancel', resetCommands.handleResetCancel);

/*
=================================
ENERGY
=================================
*/

bindAction('rest_energy', energy.handleRestEnergy);

/*
=================================
MENU
=================================
*/

bindAction('menu', async (ctx) => {
    await ctx.answerCbQuery();
    const menuText = await getMainMenuText(ctx.from.id, ctx.from.first_name);
    await ctx.editMessageText(menuText, {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
});

/*
=================================
HTTP SERVER
=================================
*/

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Noctra online');
}).listen(PORT, () => {
    console.log(`🌐 Porta ${PORT}`);
});

/*
=================================
START
=================================
*/

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));