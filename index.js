require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

// ===== HANDLERS =====
const {
  handleHunt,
  handleAttack,
  handleSoul,
  handleConsumables,
  handleFlee
} = require('./src/handlers/combat');

const {
  handleProfile,
  handleRest
} = require('./src/handlers/profile');

const {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls
} = require('./src/handlers/inventory');

const {
  handleShop,
  handleShopVillage,
  handleShopCastle,
  handleShopArena,
  handleBuy
} = require('./src/handlers/shop');

const {
  handleTravel,
  handleTravelTo,
  handleTravelLocked
} = require('./src/handlers/travel');

const {
  handleEnergy
} = require('./src/handlers/energy');

const {
  handleVip
} = require('./src/handlers/vip');

const {
  handleDaily
} = require('./src/handlers/daily');

const {
  handleOnline
} = require('./src/handlers/online');

// ===== COMMANDS =====
const {
  handleRename
} = require('./src/commands/rename');

const {
  handleClass
} = require('./src/commands/class');

const {
  handleEquip,
  handleEquipSoul
} = require('./src/commands/equip');

// ===== MENUS =====
const {
  mainMenu
} = require('./src/menus/mainMenu');

// ===== BOT =====
const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== START =====
bot.start(async (ctx) => {
  await ctx.reply(
    `🌑 *Bem-vindo ao Noctra RPG*

Escolha sua ação:`,
    {
      parse_mode: 'Markdown',
      ...mainMenu()
    }
  );
});

// ===== COMMANDS =====
bot.command('hunt', handleHunt);
bot.command('profile', handleProfile);
bot.command('inventory', handleInventory);
bot.command('shop', handleShop);
bot.command('travel', handleTravel);
bot.command('energy', handleEnergy);
bot.command('vip', handleVip);
bot.command('daily', handleDaily);
bot.command('online', handleOnline);
bot.command('rename', handleRename);
bot.command('class', handleClass);
bot.command('equip', handleEquip);
bot.command('equipsoul', handleEquipSoul);

// ===== COMBAT =====
bot.action('hunt', handleHunt);
bot.action('combat_attack', handleAttack);
bot.action('combat_soul', handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);

// ===== PROFILE =====
bot.action('profile', handleProfile);
bot.action('rest_player', handleRest);

// ===== MAIN =====
bot.action('menu', async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    `🌙 *Noctra RPG*

Escolha sua ação:`,
    {
      parse_mode: 'Markdown',
      ...mainMenu()
    }
  );
});

// ===== SCREENS =====
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);
bot.action('energy', handleEnergy);
bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);

// ===== SHOP =====
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);

bot.action(/buy_(.+)/, async (ctx) => {
  return handleBuy(ctx, ctx.match[1]);
});

// ===== TRAVEL =====
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

// ===== INVENTORY =====
bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);

// ===== HELP =====
bot.action('rename_help', async (ctx) => {
  await ctx.answerCbQuery(
    'Use /rename <novo_nome>',
    { show_alert: true }
  );
});

bot.action('class_help', async (ctx) => {
  await ctx.answerCbQuery(
    'Use /class guerreiro | arqueiro | mago',
    { show_alert: true }
  );
});

// ===== KEEP ALIVE =====
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  res.end('Noctra RPG online');
}).listen(PORT);

// ===== START =====
bot.launch();
console.log('✅ NOCTRA ONLINE');