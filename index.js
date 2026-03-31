require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const {
  handleHunt,
  handleAttack,
  handleSoul,
  handleConsumables,
  handleFlee
} = require('./src/handlers/combat');

const {
  handleProfile
} = require('./src/handlers/profile');

const {
  handleEnergy,
  handleRestEnergy
} = require('./src/handlers/energy');

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

const { handleVip } = require('./src/handlers/vip');
const { handleDaily } = require('./src/handlers/daily');
const { handleOnline } = require('./src/handlers/online');

const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const {
  handleEquip,
  handleEquipSoul
} = require('./src/commands/equip');

const { mainMenu } = require('./src/menus/mainMenu');

const bot = new Telegraf(process.env.BOT_TOKEN);

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

bot.command('energy', handleEnergy);

bot.action('hunt', handleHunt);
bot.action('combat_attack', handleAttack);
bot.action('combat_soul', handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);

bot.action('profile', handleProfile);
bot.action('energy', handleEnergy);
bot.action('rest_energy', handleRestEnergy);

bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);

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

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end('Noctra online');
}).listen(PORT);

bot.launch();
console.log('✅ NOCTRA ONLINE');