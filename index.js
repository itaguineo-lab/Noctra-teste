require('dotenv').config();

const express = require('express');
const { Telegraf } = require('telegraf');

const { mainMenu } = require('./src/menus/mainMenu');

/*
========================================
HANDLERS
========================================
*/

const {
  handleProfile,
  handleRenameAction,
  handleChangeClassAction
} = require('./src/handlers/profile');

const {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls,
  handleEquipItem,
  handleUnequipItem
} = require('./src/handlers/inventory');

const {
  handleHunt,
  handleAttack,
  handleSoul,
  handleConsumables,
  handleFlee
} = require('./src/handlers/combat');

const {
  handleTravel
} = require('./src/handlers/travel');

const {
  handleEnergy,
  handleRest
} = require('./src/handlers/energy');

const {
  getPlayer,
  createPlayer
} = require('./src/core/player/playerService');

/*
========================================
BOT + HTTP
========================================
*/

const bot = new Telegraf(process.env.BOT_TOKEN);

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('NOCTRA ONLINE');
});

app.listen(PORT, () => {
  console.log(`🌐 HTTP ONLINE ${PORT}`);
});

/*
========================================
START
========================================
*/

bot.start(async (ctx) => {
  let player = getPlayer(ctx.from.id);

  if (!player) {
    player = createPlayer(ctx.from);
  }

  await ctx.reply(
    `╔════════════════════════╗
║      🌙 NOCTRA RPG      ║
║  Bem-vindo, aventureiro ║
╠════════════════════════╣
║   Escolha sua ação:    ║
╚════════════════════════╝`,
    {
      parse_mode: 'Markdown',
      ...mainMenu(player)
    }
  );
});

/*
========================================
MENU
========================================
*/

bot.action('menu', async (ctx) => {
  await ctx.answerCbQuery();

  const player = getPlayer(ctx.from.id);

  await ctx.editMessageText(
    `╔════════════════════════╗
║      🌙 NOCTRA RPG      ║
║  Bem-vindo, aventureiro ║
╠════════════════════════╣
║   Escolha sua ação:    ║
╚════════════════════════╝`,
    {
      parse_mode: 'Markdown',
      ...mainMenu(player)
    }
  );
});

/*
========================================
PROFILE
========================================
*/

bot.action('profile', handleProfile);
bot.action('rename_help', handleRenameAction);
bot.action('class_help', handleChangeClassAction);

/*
========================================
INVENTÁRIO
========================================
*/

bot.action('inventory', handleInventory);

bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);

/*
========================================
EQUIPAR / DESEQUIPAR
========================================
*/

bot.action(/^equip_.+$/, handleEquipItem);
bot.action(/^unequip_.+$/, handleUnequipItem);

/*
========================================
COMBATE
========================================
*/

bot.action('hunt', handleHunt);
bot.action('attack', handleAttack);
bot.action('soul', handleSoul);
bot.action('consumables', handleConsumables);
bot.action('flee', handleFlee);

/*
========================================
ENERGIA
========================================
*/

bot.action('energy', handleEnergy);
bot.action('rest', handleRest);

/*
========================================
VIAGEM
========================================
*/

bot.action('travel', handleTravel);

/*
========================================
ERROS
========================================
*/

bot.catch((err) => {
  console.error('❌ ERRO GLOBAL:', err);
});

/*
========================================
LAUNCH
========================================
*/

bot.launch()
  .then(() => {
    console.log('✅ NOCTRA ONLINE');
  })
  .catch((err) => {
    console.error('❌ FALHA AO INICIAR:', err);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));