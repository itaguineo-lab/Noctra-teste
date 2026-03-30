require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const { handleHunt, handleAttack, handleSkill, handleSoul, handleFlee } = require('./src/handlers/combat');
const { handleProfile } = require('./src/handlers/profile');
const { handleInventory, handleInvWeapons, handleInvArmors, handleInvJewelry, handleInvConsumables, handleInvSouls } = require('./src/handlers/inventory');
const { handleShop, handleShopVillage, handleShopCastle, handleShopArena, handleBuy } = require('./src/handlers/shop');
const { handleTravel, handleTravelTo, handleTravelLocked } = require('./src/handlers/travel');
const { handleEnergy } = require('./src/handlers/energy');
const { handleVip } = require('./src/handlers/vip');
const { handleDaily } = require('./src/handlers/daily');
const { handleOnline } = require('./src/handlers/online');
const { mainMenu } = require('./src/menus/mainMenu');
const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const { handleEquip, handleEquipSoul } = require('./src/commands/equip');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use((ctx, next) => {
  if (ctx.callbackQuery) {
    console.log(`📞 Callback recebido: ${ctx.callbackQuery.data} de ${ctx.from.id}`);
  } else if (ctx.message && ctx.message.text) {
    console.log(`💬 Mensagem: ${ctx.message.text} de ${ctx.from.id}`);
  }
  return next();
});

bot.start(async ctx => {
  await ctx.reply('🌑 *Bem-vindo ao Noctra RPG*

Escolha sua ação:', { parse_mode: 'Markdown', ...mainMenu() });
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

bot.action('hunt', handleHunt);
bot.action('combat_attack', handleAttack);
bot.action('combat_skill', handleSkill);
bot.action('combat_soul', handleSoul);
bot.action('combat_flee', handleFlee);

bot.action('menu', async ctx => {
  await ctx.editMessageText('🌙 *Noctra RPG*

Escolha sua ação:', { parse_mode: 'Markdown', ...mainMenu() });
});

bot.action('profile', handleProfile);
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);
bot.action('energy', handleEnergy);
bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);

bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, ctx => handleBuy(ctx, ctx.match[1]));

bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);

bot.action('rename_help', async ctx => ctx.answerCbQuery('Use /rename <novo_nome>', true));
bot.action('class_help', async ctx => ctx.answerCbQuery('Use /class guerreiro | arqueiro | mago', true));

bot.catch((err, ctx) => {
  console.error(`❌ Erro para ${ctx.updateType}:`, err);
  ctx.reply('❌ Ocorreu um erro. Tente novamente.').catch(console.error);
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Noctra RPG online (polling mode)');
}).listen(PORT, () => {
  console.log(`🌐 Servidor HTTP de keep-alive rodando na porta ${PORT}`);
});

(async () => {
  try {
    const webhookInfo = await bot.telegram.getWebhookInfo();
    if (webhookInfo.url) {
      await bot.telegram.deleteWebhook();
      console.log('✅ Webhook removido com sucesso.');
    }

    await bot.launch();
    console.log('✅ Noctra RPG está online (polling mode)!');
  } catch (err) {
    console.error('❌ Falha ao iniciar o bot:', err);
    process.exit(1);
  }
})();

process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});