require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const { connectToMongo } = require('./src/core/player/playerService');
const { getMainMenuText } = require('./src/utils/helpers');

const { mainMenu } = require('./src/menus/mainMenu');
const { handleProfile } = require('./src/handlers/profile');

const {
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvBoots,
    handleInvConsumables,
    handleInvSouls,
    handleEquipItem,
    handleUnequipItem,
    handleInventoryPage,
    handleInventoryCategory,
    handleEquipSoul,
    handleUnequipSoul,
    handleUsePotionOutside
} = require('./src/handlers/inventory');

const {
    handleHunt,
    handleAttack,
    handleDefend,
    handleSoulMenu,
    handleSoul,
    handleConsumables,
    handleFlee,
    handleCombatBack,
    useConsumable
} = require('./src/handlers/combat');

const {
    handleTravel,
    handleTravelTo,
    handleTravelLocked
} = require('./src/handlers/travel');

const { handleEnergy, handleRestEnergy } = require('./src/handlers/energy');
const { handleVip } = require('./src/handlers/vip');
const { handleDaily } = require('./src/handlers/daily');
const { handleOnline } = require('./src/handlers/online');
const { handleRanking } = require('./src/handlers/ranking');

const {
    handleDungeon,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee
} = require('./src/handlers/dungeon');

const {
    handleShop,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy
} = require('./src/handlers/shop');

const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const { handleEquip, handleEquipSoulCommand } = require('./src/commands/equip');
const { handleReset } = require('./src/commands/reset');

const bot = new Telegraf(process.env.BOT_TOKEN);

let launched = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function bindCommand(name, handler) {
    if (typeof handler === 'function') {
        bot.command(name, handler);
    } else {
        console.log(`⚠️ Handler ausente para /${name}`);
    }
}

function bindAction(pattern, handler) {
    if (typeof handler === 'function') {
        bot.action(pattern, handler);
    } else {
        console.log(`⚠️ Handler ausente para action: ${String(pattern)}`);
    }
}

async function startBot() {
    if (launched) return;
    launched = true;

    try {
        await bot.telegram.deleteWebhook({
            drop_pending_updates: true
        });

        console.log('✅ Webhook removido');

        await sleep(3000);

        await connectToMongo();
        console.log('✅ Banco de dados MongoDB conectado');

        for (let attempt = 1; attempt <= 4; attempt++) {
            try {
                await bot.launch({
                    dropPendingUpdates: true
                });

                console.log('✅ NOCTRA ONLINE (polling mode)');
                return;
            } catch (error) {
                if (error?.response?.error_code === 409 && attempt < 4) {
                    console.log(
                        `⚠️ 409 Conflict no launch. Tentativa ${attempt}/4. Aguardando a instância anterior encerrar...`
                    );

                    await sleep(5000);
                    continue;
                }

                if (error?.response?.error_code === 409) {
                    console.log('⚠️ Instância antiga ainda encerrando no Render');
                    return;
                }

                throw error;
            }
        }
    } catch (err) {
        console.error('❌ Erro ao iniciar:', err);
    }
}

/*
=================================
START
=================================
*/

bot.start(async (ctx) => {
    const menuText = await getMainMenuText(
        ctx.from.id,
        ctx.from.first_name
    );

    await ctx.reply(menuText, {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
});

/*
=================================
COMANDOS
=================================
*/

bindCommand('energy', handleEnergy);
bindCommand('rename', handleRename);
bindCommand('class', handleClass);
bindCommand('profile', handleProfile);
bindCommand('inventory', handleInventory);
bindCommand('travel', handleTravel);
bindCommand('shop', handleShop);
bindCommand('daily', handleDaily);
bindCommand('vip', handleVip);
bindCommand('online', handleOnline);
bindCommand('equip', handleEquip);
bindCommand('equipsoul', handleEquipSoulCommand);
bindCommand('ranking', handleRanking);
bindCommand('reset', handleReset);

/*
=================================
AÇÕES MENU
=================================
*/

bindAction('hunt', handleHunt);
bindAction('profile', handleProfile);
bindAction('energy', handleEnergy);
bindAction('inventory', handleInventory);
bindAction('shop', handleShop);
bindAction('travel', handleTravel);
bindAction('vip', handleVip);
bindAction('daily', handleDaily);
bindAction('online', handleOnline);
bindAction('ranking', handleRanking);
bindAction('dungeon', handleDungeon);

/*
=================================
COMBATE
=================================
*/

bindAction('combat_attack', handleAttack);
bindAction('combat_defend', handleDefend);
bindAction('combat_soul_menu', handleSoulMenu);
bindAction(/combat_soul_([01])/, handleSoul);
bindAction('combat_consumables', handleConsumables);
bindAction('combat_flee', handleFlee);
bindAction('combat_back', handleCombatBack);

/*
=================================
CONSUMÍVEIS
=================================
*/

bindAction('use_potion_hp', (ctx) =>
    useConsumable(ctx, 'potion_hp')
);

bindAction('use_potion_energy', (ctx) =>
    useConsumable(ctx, 'potion_energy')
);

bindAction('use_tonic_strength', (ctx) =>
    useConsumable(ctx, 'tonic_strength')
);

bindAction('use_tonic_defense', (ctx) =>
    useConsumable(ctx, 'tonic_defense')
);

bindAction('noop', async (ctx) => {
    await ctx.answerCbQuery();
    await handleConsumables(ctx);
});

bindAction('use_potion_outside_hp', (ctx) =>
    handleUsePotionOutside(ctx, 'hp')
);

bindAction('rest_energy', handleRestEnergy);

/*
=================================
INVENTÁRIO NOVO
=================================
*/

bindAction('inventory', handleInventory);

bindAction('invcat:weapons', handleInventoryCategory);
bindAction('invcat:armors', handleInventoryCategory);
bindAction('invcat:jewelry', handleInventoryCategory);
bindAction('invcat:boots', handleInventoryCategory);
bindAction('invcat:consumables', handleInventoryCategory);
bindAction('invcat:skins', handleInventoryCategory);
bindAction('invcat:souls', handleInventoryCategory);

bindAction(
    /^invpage:(weapons|armors|jewelry|boots):(\d+)$/,
    handleInventoryPage
);

bindAction(
    /^eq:(weapons|armors|jewelry|boots):(\d+):(\d+)$/,
    handleEquipItem
);

bindAction(
    /^uneq:(weapon|armor|necklace|ring|boots):(weapons|armors|jewelry|boots):(\d+)$/,
    handleUnequipItem
);

bindAction(/^equip_soul_(.+)$/, handleEquipSoul);
bindAction(/^unequip_soul_(\d+)$/, handleUnequipSoul);

/*
=================================
ALIASES LEGADOS
=================================
*/

bindAction('inv_weapons', handleInvWeapons);
bindAction('inv_armors', handleInvArmors);
bindAction('inv_jewelry', handleInvJewelry);
bindAction('inv_boots', handleInvBoots);
bindAction('inv_consumables', handleInvConsumables);
bindAction('inv_souls', handleInvSouls);

bindAction('inv_weapon', handleInvWeapons);
bindAction('inv_armor', handleInvArmors);

bindAction('inv_skin', async (ctx) => {
    await ctx.answerCbQuery('🎨 Skins em breve.', {
        show_alert: true
    });
});

bindAction('auto_equip', async (ctx) => {
    await ctx.answerCbQuery('✨ Auto equip em ajuste.', {
        show_alert: true
    });
});

bindAction('inv_consumable', handleInvConsumables);
bindAction('inv_soul', handleInvSouls);

/*
=================================
COMPATIBILIDADE LEGADA EQUIP
=================================
*/

bindAction(
    /^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/,
    handleEquipItem
);

bindAction(
    /^unequip_(weapon|armor|necklace|ring|boots)$/,
    handleUnequipItem
);

/*
=================================
LOJA
=================================
*/

bindAction('shop_village', handleShopVillage);
bindAction('shop_castle', handleShopCastle);
bindAction('shop_arena', handleShopArena);
bindAction(/buy_(.+)/, handleBuy);

/*
=================================
VIAGEM
=================================
*/

bindAction(/travel_to_(.+)/, handleTravelTo);
bindAction('travel_locked', handleTravelLocked);

/*
=================================
DUNGEON
=================================
*/

bindAction('dungeon_attack', handleDungeonAttack);
bindAction('dungeon_next_room', handleDungeonNextRoom);
bindAction('dungeon_flee', handleDungeonFlee);

/*
=================================
MENU
=================================
*/

bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();

    const menuText = await getMainMenuText(
        ctx.from.id,
        ctx.from.first_name
    );

    await ctx.editMessageText(menuText, {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
});

/*
=================================
HTTP SERVER RENDER
=================================
*/

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('Noctra online');
}).listen(PORT, () => {
    console.log(`🌐 Porta ${PORT}`);
});

startBot().catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));