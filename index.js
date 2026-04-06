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

const bot = new Telegraf(process.env.BOT_TOKEN);

let launched = false;

async function startBot() {
    if (launched) return;
    launched = true;

    try {
        await bot.telegram.deleteWebhook({
            drop_pending_updates: true
        });

        console.log('✅ Webhook removido');

        await new Promise(resolve => setTimeout(resolve, 3000));

        await connectToMongo();
        console.log('✅ Banco de dados MongoDB conectado');

        try {
            await bot.launch({
                dropPendingUpdates: true
            });

            console.log('✅ NOCTRA ONLINE (polling mode)');
        } catch (error) {
            if (error?.response?.error_code === 409) {
                console.log('⚠️ Instância antiga ainda encerrando no Render');
                return;
            }

            throw error;
        }

    } catch (err) {
        console.error('❌ Erro ao iniciar:', err);
    }
}

/*
=================================
COMANDOS
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

bot.command('energy', handleEnergy);
bot.command('rename', handleRename);
bot.command('class', handleClass);
bot.command('profile', handleProfile);
bot.command('inventory', handleInventory);
bot.command('travel', handleTravel);
bot.command('shop', handleShop);
bot.command('daily', handleDaily);
bot.command('vip', handleVip);
bot.command('online', handleOnline);
bot.command('equip', handleEquip);
bot.command('equipsoul', handleEquipSoulCommand);
bot.command('ranking', handleRanking);

/*
=================================
AÇÕES MENU
=================================
*/

bot.action('hunt', handleHunt);
bot.action('profile', handleProfile);
bot.action('energy', handleEnergy);
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);
bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);
bot.action('ranking', handleRanking);
bot.action('dungeon', handleDungeon);

/*
=================================
COMBATE
=================================
*/

bot.action('combat_attack', handleAttack);
bot.action('combat_defend', handleDefend);
bot.action('combat_soul_menu', handleSoulMenu);
bot.action(/combat_soul_([01])/, handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);
bot.action('combat_back', handleCombatBack);

/*
=================================
CONSUMÍVEIS
=================================
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

bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
    await handleConsumables(ctx);
});

bot.action('use_potion_outside_hp', (ctx) =>
    handleUsePotionOutside(ctx, 'hp')
);

bot.action('rest_energy', handleRestEnergy);

/*
=================================
INVENTÁRIO
=================================
*/

bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_boots', handleInvBoots);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);

bot.action(
    /^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/,
    handleEquipItem
);

bot.action(
    /^unequip_(weapon|armor|necklace|ring|boots)$/,
    handleUnequipItem
);

bot.action(/^equip_soul_(.+)$/, handleEquipSoul);
bot.action(/^unequip_soul_(\d+)$/, handleUnequipSoul);

/*
=================================
LOJA
=================================
*/

bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, handleBuy);

/*
=================================
VIAGEM
=================================
*/

bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

/*
=================================
DUNGEON
=================================
*/

bot.action('dungeon_attack', handleDungeonAttack);
bot.action('dungeon_next_room', handleDungeonNextRoom);
bot.action('dungeon_flee', handleDungeonFlee);

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
}).listen(PORT);

startBot().catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));