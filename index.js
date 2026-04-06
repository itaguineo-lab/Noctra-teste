require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');
const { connectToMongo } = require('./src/core/player/playerService');
const { getMainMenuText } = require('./src/utils/helpers');

const { mainMenu } = require('./src/menus/mainMenu');
const { handleProfile } = require('./src/handlers/profile');

const inventoryHandlers = require('./src/handlers/inventory');
const combatHandlers = require('./src/handlers/combat');
const travelHandlers = require('./src/handlers/travel');
const energyHandlers = require('./src/handlers/energy');
const vipHandlers = require('./src/handlers/vip');
const dailyHandlers = require('./src/handlers/daily');
const onlineHandlers = require('./src/handlers/online');
const rankingHandlers = require('./src/handlers/ranking');
const dungeonHandlers = require('./src/handlers/dungeon');
const shopHandlers = require('./src/handlers/shop');

const renameCommand = require('./src/commands/rename');
const classCommand = require('./src/commands/class');
const equipCommand = require('./src/commands/equip');

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
HELPER
=================================
*/

function safeCommand(name, handler) {
    if (typeof handler === 'function') {
        bot.command(name, handler);
    } else {
        console.log(`⚠️ Handler ausente para /${name}`);
    }
}

function safeAction(pattern, handler) {
    if (typeof handler === 'function') {
        bot.action(pattern, handler);
    } else {
        console.log(`⚠️ Handler ausente para action: ${pattern}`);
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

safeCommand('energy', energyHandlers.handleEnergy);
safeCommand('rename', renameCommand.handleRename);
safeCommand('class', classCommand.handleClass);
safeCommand('profile', handleProfile);
safeCommand('inventory', inventoryHandlers.handleInventory);
safeCommand('travel', travelHandlers.handleTravel);
safeCommand('shop', shopHandlers.handleShop);
safeCommand('daily', dailyHandlers.handleDaily);
safeCommand('vip', vipHandlers.handleVip);
safeCommand('online', onlineHandlers.handleOnline);
safeCommand('ranking', rankingHandlers.handleRanking);

safeCommand('equip', equipCommand.handleEquip);
safeCommand('equipsoul', equipCommand.handleEquipSoulCommand);

/*
=================================
AÇÕES MENU
=================================
*/

safeAction('hunt', combatHandlers.handleHunt);
safeAction('profile', handleProfile);
safeAction('energy', energyHandlers.handleEnergy);
safeAction('inventory', inventoryHandlers.handleInventory);
safeAction('shop', shopHandlers.handleShop);
safeAction('travel', travelHandlers.handleTravel);
safeAction('vip', vipHandlers.handleVip);
safeAction('daily', dailyHandlers.handleDaily);
safeAction('online', onlineHandlers.handleOnline);
safeAction('ranking', rankingHandlers.handleRanking);
safeAction('dungeon', dungeonHandlers.handleDungeon);

/*
=================================
COMBATE
=================================
*/

safeAction('combat_attack', combatHandlers.handleAttack);
safeAction('combat_defend', combatHandlers.handleDefend);
safeAction('combat_soul_menu', combatHandlers.handleSoulMenu);
safeAction(/combat_soul_([01])/, combatHandlers.handleSoul);
safeAction('combat_consumables', combatHandlers.handleConsumables);
safeAction('combat_flee', combatHandlers.handleFlee);
safeAction('combat_back', combatHandlers.handleCombatBack);

/*
=================================
CONSUMÍVEIS
=================================
*/

safeAction('rest_energy', energyHandlers.handleRestEnergy);

if (typeof combatHandlers.useConsumable === 'function') {
    bot.action('use_potion_hp', (ctx) =>
        combatHandlers.useConsumable(ctx, 'potion_hp')
    );

    bot.action('use_potion_energy', (ctx) =>
        combatHandlers.useConsumable(ctx, 'potion_energy')
    );

    bot.action('use_tonic_strength', (ctx) =>
        combatHandlers.useConsumable(ctx, 'tonic_strength')
    );

    bot.action('use_tonic_defense', (ctx) =>
        combatHandlers.useConsumable(ctx, 'tonic_defense')
    );
}

/*
=================================
INVENTÁRIO
=================================
*/

safeAction('inv_weapons', inventoryHandlers.handleInvWeapons);
safeAction('inv_armors', inventoryHandlers.handleInvArmors);
safeAction('inv_jewelry', inventoryHandlers.handleInvJewelry);
safeAction('inv_boots', inventoryHandlers.handleInvBoots);
safeAction('inv_consumables', inventoryHandlers.handleInvConsumables);
safeAction('inv_souls', inventoryHandlers.handleInvSouls);

safeAction(
    /^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/,
    inventoryHandlers.handleEquipItem
);

safeAction(
    /^unequip_(weapon|armor|necklace|ring|boots)$/,
    inventoryHandlers.handleUnequipItem
);

safeAction(/^equip_soul_(.+)$/, inventoryHandlers.handleEquipSoul);
safeAction(/^unequip_soul_(\d+)$/, inventoryHandlers.handleUnequipSoul);

/*
=================================
LOJA
=================================
*/

safeAction('shop_village', shopHandlers.handleShopVillage);
safeAction('shop_castle', shopHandlers.handleShopCastle);
safeAction('shop_arena', shopHandlers.handleShopArena);
safeAction(/buy_(.+)/, shopHandlers.handleBuy);

/*
=================================
VIAGEM
=================================
*/

safeAction(/travel_to_(.+)/, travelHandlers.handleTravelTo);
safeAction('travel_locked', travelHandlers.handleTravelLocked);

/*
=================================
DUNGEON
=================================
*/

safeAction('dungeon_attack', dungeonHandlers.handleDungeonAttack);
safeAction('dungeon_next_room', dungeonHandlers.handleDungeonNextRoom);
safeAction('dungeon_flee', dungeonHandlers.handleDungeonFlee);

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