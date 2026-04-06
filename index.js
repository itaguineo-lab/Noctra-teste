require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const { connectToMongo } = require('./src/core/player/playerService');
const { getMainMenuText } = require('./src/utils/helpers');
const { mainMenu } = require('./src/menus/mainMenu');

const { handleProfile } = require('./src/handlers/profile');

const {
    renderInventory,
    handleInventory,
    handleEquipItem,
    handleUnequipItem
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

const {
    handleEnergy,
    handleRestEnergy
} = require('./src/handlers/energy');

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

const bot = new Telegraf(process.env.BOT_TOKEN);

let started = false;

/*
====================================
START BOT
====================================
*/

async function startBot() {
    if (started) return;
    started = true;

    try {
        await connectToMongo();
        console.log('✅ Banco de dados MongoDB conectado');

        await bot.telegram.deleteWebhook({
            drop_pending_updates: true
        });

        console.log('✅ Webhook removido');

        await bot.launch({
            dropPendingUpdates: true
        });

        console.log('✅ NOCTRA ONLINE (polling mode)');
    } catch (error) {
        console.error('❌ Erro ao iniciar:', error);
    }
}

/*
====================================
COMANDOS
====================================
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

bot.command('profile', handleProfile);
bot.command('inventory', handleInventory);
bot.command('energy', handleEnergy);
bot.command('travel', handleTravel);
bot.command('shop', handleShop);
bot.command('daily', handleDaily);
bot.command('vip', handleVip);
bot.command('online', handleOnline);
bot.command('ranking', handleRanking);
bot.command('rename', handleRename);
bot.command('class', handleClass);
bot.command('equip', handleEquip);
bot.command('equipsoul', handleEquipSoulCommand);

/*
====================================
MENU
====================================
*/

bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();

    const menuText = await getMainMenuText(
        ctx.from.id,
        ctx.from.first_name
    );

    return ctx.editMessageText(menuText, {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
});

bot.action('profile', handleProfile);

/*
====================================
INVENTÁRIO
====================================
*/

bot.action('inventory', handleInventory);

bot.action('inv_weapons', (ctx) =>
    renderInventory(ctx, 'weapons')
);

bot.action('inv_armors', (ctx) =>
    renderInventory(ctx, 'armors')
);

bot.action('inv_jewelry', (ctx) =>
    renderInventory(ctx, 'jewelry')
);

bot.action('inv_boots', (ctx) =>
    renderInventory(ctx, 'boots')
);

/*
CORREÇÃO CRÍTICA DO BUG
*/

bot.action(
    /^equip_(weapon|armor|necklace|ring|boots)_(.+)$/,
    handleEquipItem
);

bot.action(
    /^unequip_(weapon|armor|necklace|ring|boots)$/,
    handleUnequipItem
);

/*
====================================
COMBATE
====================================
*/

bot.action('hunt', handleHunt);
bot.action('combat_attack', handleAttack);
bot.action('combat_defend', handleDefend);
bot.action('combat_soul_menu', handleSoulMenu);
bot.action(/combat_soul_([01])/, handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);
bot.action('combat_back', handleCombatBack);

/*
====================================
CONSUMÍVEIS
====================================
*/

bot.action('use_potion_hp', (ctx) =>
    useConsumable(ctx, 'potion_hp')
);

bot.action('use_potion_energy', (ctx) =>
    useConsumable(ctx, 'potion_energy')
);

bot.action('use_tonic_strength', (ctx) =>
    useConsumable(ctx, 'tonic_strength')
);

bot.action('use_tonic_defense', (ctx) =>
    useConsumable(ctx, 'tonic_defense')
);

/*
====================================
OUTROS MENUS
====================================
*/

bot.action('travel', handleTravel);
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

bot.action('energy', handleEnergy);
bot.action('rest_energy', handleRestEnergy);

bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);
bot.action('ranking', handleRanking);

/*
====================================
LOJA
====================================
*/

bot.action('shop', handleShop);
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, handleBuy);

/*
====================================
DUNGEON
====================================
*/

bot.action('dungeon', handleDungeon);
bot.action('dungeon_attack', handleDungeonAttack);
bot.action('dungeon_next_room', handleDungeonNextRoom);
bot.action('dungeon_flee', handleDungeonFlee);

/*
====================================
ERRO GLOBAL
====================================
*/

bot.catch((err, ctx) => {
    console.error('❌ ERRO GLOBAL:', err);

    if (ctx?.answerCbQuery) {
        ctx.answerCbQuery('❌ Erro interno').catch(() => {});
    }
});

/*
====================================
RENDER HTTP SERVER
====================================
*/

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('NOCTRA ONLINE');
}).listen(PORT, () => {
    console.log(`🌐 Porta ${PORT}`);
});

/*
====================================
BOOT
====================================
*/

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));