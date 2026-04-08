require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const { connectToMongo } = require('./src/core/player/playerService');
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
const { handleReset } = require('./src/commands/reset');

const bot = new Telegraf(process.env.BOT_TOKEN);

let launched = false;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

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
        await bot.telegram.deleteWebhook({
            drop_pending_updates: true
        });

        console.log('✅ Webhook removido');

        await sleep(3000);

        await connectToMongo();
        console.log('✅ MongoDB conectado');

        await bot.launch({
            dropPendingUpdates: true
        });

        console.log('🌑 NOCTRA ONLINE');
    } catch (err) {
        console.error('❌ Erro ao iniciar bot:', err);
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
COMMANDS
=================================
*/

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
bindCommand('reset', handleReset);

/*
=================================
PROFILE HELP
=================================
*/

bindAction('rename_help', async (ctx) => {
    await ctx.answerCbQuery('Use /rename novo_nome', { show_alert: true });
});

bindAction('class_help', async (ctx) => {
    await ctx.answerCbQuery(
        'Use /class guerreiro | arqueiro | mago',
        { show_alert: true }
    );
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

/*
=================================
SHOP
=================================
*/

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

bindAction('dungeon_attack', dungeon.handleDungeonAttack);
bindAction('dungeon_next_room', dungeon.handleDungeonNextRoom);
bindAction('dungeon_flee', dungeon.handleDungeonFlee);

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
HTTP SERVER
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

/*
=================================
START
=================================
*/

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));