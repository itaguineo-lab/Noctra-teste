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
const { handleDungeon, handleDungeonAttack, handleDungeonNextRoom, handleDungeonFlee } = require('./src/handlers/dungeon');
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

// Remove webhook FORÇADAMENTE com drop_pending_updates
(async () => {
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook removido com drop_pending_updates.');
        // Aguarda 3 segundos para garantir que o Telegram processe
        await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
        console.error('❌ Erro ao remover webhook:', err.message);
    }
})();

// Comandos de texto
bot.start(async (ctx) => {
    const menuText = await getMainMenuText(ctx.from.id, ctx.from.first_name);
    await ctx.reply(menuText, { parse_mode: 'Markdown', ...mainMenu() });
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

// Ações de menu
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

// Combate
bot.action('combat_attack', handleAttack);
bot.action('combat_defend', handleDefend);
bot.action('combat_soul_menu', handleSoulMenu);
bot.action(/combat_soul_([01])/, handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);
bot.action('combat_back', handleCombatBack);

// Submenu de consumíveis (combate)
bot.action('use_potion_hp', (ctx) => useConsumable(ctx, 'potion_hp'));
bot.action('use_potion_energy', (ctx) => useConsumable(ctx, 'potion_energy'));
bot.action('use_tonic_strength', (ctx) => useConsumable(ctx, 'tonic_strength'));
bot.action('use_tonic_defense', (ctx) => useConsumable(ctx, 'tonic_defense'));
bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
    await handleConsumables(ctx);
});

// Uso de poção fora de combate
bot.action('use_potion_outside_hp', (ctx) => handleUsePotionOutside(ctx, 'hp'));

// Energia
bot.action('rest_energy', handleRestEnergy);

// Inventário – categorias
bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_boots', handleInvBoots);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);

// Equipar / Desequipar itens
bot.action(/^equip_(weapon|armor|necklace|ring|boots)_(.+)$/, handleEquipItem);
bot.action(/^unequip_(weapon|armor|necklace|ring|boots)$/, handleUnequipItem);

// Almas
bot.action(/^equip_soul_(.+)$/, handleEquipSoul);
bot.action(/^unequip_soul_(\d+)$/, handleUnequipSoul);

// Loja
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, handleBuy);

// Viagem
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

// Masmorra
bot.action('dungeon_attack', handleDungeonAttack);
bot.action('dungeon_next_room', handleDungeonNextRoom);
bot.action('dungeon_flee', handleDungeonFlee);

// Menu
bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();
    const menuText = await getMainMenuText(ctx.from.id, ctx.from.first_name);
    await ctx.editMessageText(menuText, { parse_mode: 'Markdown', ...mainMenu() });
});

// Ajuda
bot.action('rename_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`📝 *Renomear*\n\nUse: /rename <novo_nome>\n\n*Custo:* 1ª grátis, depois 💎 100 Nox.`, { parse_mode: 'Markdown' });
});
bot.action('class_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`🔄 *Trocar Classe*\n\nUse: /class guerreiro | arqueiro | mago\n\n*Custo:* 1ª grátis, depois 💎 500 Nox.`, { parse_mode: 'Markdown' });
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Noctra online');
}).listen(PORT);

// Inicialização com MongoDB
(async () => {
    await connectToMongo();
    console.log('✅ Banco de dados MongoDB conectado');
    bot.launch();
    console.log('✅ NOCTRA ONLINE (polling mode)');
})();