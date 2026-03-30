require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const {
    handleHunt,
    handleAttack,
    handleFlee
} = require('./src/handlers/combat');

const {
    handleProfile
} = require('./src/handlers/profile');

const {
    handleInventory
} = require('./src/handlers/inventory');

const {
    handleShop
} = require('./src/handlers/shop');

const {
    handleTravel
} = require('./src/handlers/travel');

const {
    mainMenu
} = require('./src/menus/mainMenu');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== START =====
bot.start(async (ctx) => {
    await ctx.reply(
        `🌑 *Bem-vindo ao Noctra RPG*\n\nEscolha sua ação:`,
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

// ===== ACTIONS =====
bot.action('hunt', handleHunt);
bot.action('attack', handleAttack);
bot.action('flee', handleFlee);

bot.action('profile', handleProfile);
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);

// ===== ERROR =====
bot.catch((err) => {
    console.error('Erro do bot:', err);
});

// ===== LAUNCH =====
(async () => {
    try {
        await bot.launch();
        console.log('✅ Noctra online');
    } catch (err) {
        console.error('❌ Falha ao iniciar:', err);
    }
})();

// ===== KEEP RENDER ALIVE =====
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Noctra RPG online');
}).listen(PORT, () => {
    console.log(`🌐 Servidor ativo na porta ${PORT}`);
});

// ===== SHUTDOWN =====
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));