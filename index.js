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
  handleInvSouls,
  handleToggleEquip
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
  handleVip
} = require('./src/handlers/vip');

const {
  handleDaily
} = require('./src/handlers/daily');

const {
  handleOnline
} = require('./src/handlers/online');

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

const {
  mainMenu
} = require('./src/menus/mainMenu');

const bot = new Telegraf(process.env.BOT_TOKEN);

async function safeEditOrReply(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch {
    await ctx.reply(text, options);
  }
}

bot.start(async (ctx) => {
  await safeEditOrReply(
    ctx,
    `╔════════════════════════╗
║      🌙 NOCTRA RPG      ║
║    Bem-vindo, aventureiro    ║
╠════════════════════════╣
║   Escolha sua ação:    ║
╚════════════════════════╝`,
    {
      ...mainMenu()
    }
  );
});

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

bot.action('menu', async (ctx) => {
  await safeEditOrReply(
    ctx,
    `╔════════════════════════╗
║      🌙 NOCTRA RPG      ║
║    Bem-vindo, aventureiro    ║
╠════════════════════════╣
║   Escolha sua ação:    ║
╚════════════════════════╝`,
    {
      ...mainMenu()
    }
  );
});

bot.action('hunt', handleHunt);
bot.action('combat_attack', handleAttack);
bot.action('combat_soul', handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);

bot.action('profile', handleProfile);

bot.action('energy', handleEnergy);
bot.action('rest_energy', handleRestEnergy);

bot.action('inventory', handleInventory);
bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);
bot.action(/toggle_equip_(.+)/, handleToggleEquip);

bot.action('shop', handleShop);
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, handleBuy);

bot.action('travel', handleTravel);
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);

bot.catch((err, ctx) => {
  console.error('❌ ERRO GLOBAL:', err);

  try {
    ctx.reply('❌ Ocorreu um erro inesperado.');
  } catch {}
});

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/plain'
    });

    res.end('NOCTRA ONLINE');
  })
  .listen(PORT, () => {
    console.log(`🌐 HTTP ONLINE ${PORT}`);
  });

bot.launch()
  .then(() => {
    console.log('✅ NOCTRA ONLINE');
  })
  .catch((err) => {
    console.error('❌ FALHA AO INICIAR:', err);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));