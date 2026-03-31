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
  handleEquipSoul,
  handleEquipItemCallback,
  handleEquipSoulCallback
} = require('./src/commands/equip');

const { mainMenu } = require('./src/menus/mainMenu');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ======================
// COMANDOS DE TEXTO
// ======================
bot.start(async (ctx) => {
  const welcomeMsg = 
`╔════════════════════════╗
║      🌙 *NOCTRA RPG*      ║
║    Bem-vindo, aventureiro    ║
╠════════════════════════╣
║   Escolha sua ação:    ║
╚════════════════════════╝`;

  await ctx.reply(welcomeMsg, {
    parse_mode: 'Markdown',
    ...mainMenu()
  });
});

bot.command('energy', handleEnergy);
bot.command('rename', handleRename);
bot.command('class', handleClass);
bot.command('equip', handleEquip);
bot.command('equipsoul', handleEquipSoul);

// ======================
// AÇÕES DO MENU PRINCIPAL
// ======================
bot.action('hunt', handleHunt);
bot.action('profile', handleProfile);
bot.action('energy', handleEnergy);
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);
bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);

// ======================
// COMBATE
// ======================
bot.action('combat_attack', handleAttack);
bot.action('combat_soul', handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);

// ======================
// ENERGIA
// ======================
bot.action('rest_energy', handleRestEnergy);

// ======================
// INVENTÁRIO – CATEGORIAS
// ======================
bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);

// ======================
// EQUIPAR ITENS E ALMAS (via callback)
// ======================
bot.action(/equip_item_(.+)/, handleEquipItemCallback);
bot.action(/equip_soul_(.+)/, handleEquipSoulCallback);

// ======================
// LOJA
// ======================
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, handleBuy);

// ======================
// VIAJAR
// ======================
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

// ======================
// MENU PRINCIPAL
// ======================
bot.action('menu', async (ctx) => {
  await ctx.answerCbQuery();
  const menuMsg = 
`╔════════════════════════╗
║      🌙 *NOCTRA RPG*      ║
╠════════════════════════╣
║   Escolha sua ação:    ║
╚════════════════════════╝`;
  await ctx.editMessageText(menuMsg, {
    parse_mode: 'Markdown',
    ...mainMenu()
  });
});

// ======================
// AJUDA PARA RENOMEAR / TROCAR CLASSE
// ======================
bot.action('rename_help', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `📝 *Renomear*\n\n` +
    `Use o comando:\n` +
    `/rename <novo_nome>\n\n` +
    `*Custo:* primeira vez grátis, depois 💎 100 Nox.`,
    { parse_mode: 'Markdown' }
  );
});

bot.action('class_help', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `🔄 *Trocar Classe*\n\n` +
    `Use o comando:\n` +
    `/class guerreiro | arqueiro | mago\n\n` +
    `*Custo:* primeira vez grátis, depois 💎 500 Nox.`,
    { parse_mode: 'Markdown' }
  );
});

// ======================
// SERVIDOR WEB (para manter o bot ativo)
// ======================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Noctra online');
}).listen(PORT);

// ======================
// INICIALIZAÇÃO
// ======================
bot.launch();
console.log('✅ NOCTRA ONLINE');