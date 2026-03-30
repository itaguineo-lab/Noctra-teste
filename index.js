require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

// Handlers principais
const {
    handleHunt,
    handleAttack,
    handleSkill,
    handleSoul,
    handleFlee
} = require('./src/handlers/combat');

const { handleProfile } = require('./src/handlers/profile');
const { handleInventory } = require('./src/handlers/inventory');
const {
    handleShop,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy
} = require('./src/handlers/shop');

const { handleTravel, handleTravelTo, handleTravelLocked } = require('./src/handlers/travel');
const { handleEnergy } = require('./src/handlers/energy');
const { handleVip } = require('./src/handlers/vip');
const { handleDaily } = require('./src/handlers/daily');
const { handleOnline } = require('./src/handlers/online');

// Menus
const { mainMenu } = require('./src/menus/mainMenu');

// Comandos de texto
const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const { handleEquip, handleEquipSoul } = require('./src/commands/equip');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===================== MIDDLEWARE DE LOG =====================
bot.use((ctx, next) => {
    if (ctx.callbackQuery) {
        console.log(`📞 Callback recebido: ${ctx.callbackQuery.data} de ${ctx.from.id}`);
    } else if (ctx.message && ctx.message.text) {
        console.log(`💬 Mensagem: ${ctx.message.text} de ${ctx.from.id}`);
    }
    return next();
});

// ===================== COMANDOS /text =====================
bot.start(async (ctx) => {
    console.log(`🚀 Start command from ${ctx.from.id}`);
    await ctx.reply(
        `🌑 *Bem-vindo ao Noctra RPG*\n\nEscolha sua ação:`,
        { parse_mode: 'Markdown', ...mainMenu() }
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

// ===================== ACTIONS (callbacks) =====================
// Combate
bot.action('hunt', handleHunt);
bot.action('combat_attack', handleAttack);
bot.action('combat_skill', handleSkill);
bot.action('combat_soul', handleSoul);
bot.action('combat_flee', handleFlee);

// Menu principal
bot.action('menu', async (ctx) => {
    await ctx.editMessageText(
        `🌙 *Noctra RPG*\n\nEscolha sua ação:`,
        { parse_mode: 'Markdown', ...mainMenu() }
    );
});

// Perfil, inventário, loja, viagem
bot.action('profile', handleProfile);
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);
bot.action('energy', handleEnergy);
bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);

// Lojas por aba
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);

// Compras (formato: buy_<itemId>)
bot.action(/buy_(.+)/, (ctx) => handleBuy(ctx, ctx.match[1]));

// Viagem - ações específicas
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

// Categorias do inventário
const inventoryHandlers = require('./src/handlers/inventory');
bot.action('inv_weapons', inventoryHandlers.handleInvWeapons);
bot.action('inv_armors', inventoryHandlers.handleInvArmors);
bot.action('inv_jewelry', inventoryHandlers.handleInvJewelry);
bot.action('inv_consumables', inventoryHandlers.handleInvConsumables);
bot.action('inv_souls', inventoryHandlers.handleInvSouls);

// Ações de perfil
bot.action('rename_help', async (ctx) => {
    await ctx.answerCbQuery('Use /rename <novo_nome>', true);
});
bot.action('class_help', async (ctx) => {
    await ctx.answerCbQuery('Use /class guerreiro | arqueiro | mago', true);
});

// ===================== TRATAMENTO DE ERROS =====================
bot.catch((err, ctx) => {
    console.error(`❌ Erro para ${ctx.updateType}:`, err);
    ctx.reply('❌ Ocorreu um erro. Tente novamente.').catch(console.error);
});

// ===================== INICIALIZAÇÃO (POLLING FORÇADO) =====================
const PORT = process.env.PORT || 3000;

// Servidor HTTP apenas para manter o Render/Heroku ativo (não interfere no polling)
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Noctra RPG online (polling mode)');
}).listen(PORT, () => {
    console.log(`🌐 Servidor HTTP de keep-alive rodando na porta ${PORT}`);
});

(async () => {
    try {
        // 🔥 CRÍTICO: Remove qualquer webhook existente para usar polling
        const webhookInfo = await bot.telegram.getWebhookInfo();
        if (webhookInfo.url) {
            console.log(`⚠️ Webhook detectado: ${webhookInfo.url}. Removendo...`);
            await bot.telegram.deleteWebhook();
            console.log('✅ Webhook removido com sucesso.');
        } else {
            console.log('✅ Nenhum webhook ativo. Usando polling.');
        }
        
        // Inicia o bot em modo polling
        await bot.launch();
        console.log('✅ Noctra RPG está online (polling mode)!');
        console.log('🎮 Bot pronto para receber comandos e callbacks.');
    } catch (err) {
        console.error('❌ Falha ao iniciar o bot:', err);
        process.exit(1);
    }
})();

// Encerramento gracioso
process.once('SIGINT', () => {
    console.log('🛑 Encerrando por SIGINT...');
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    console.log('🛑 Encerrando por SIGTERM...');
    bot.stop('SIGTERM');
    process.exit(0);
});