require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const http = require('http');

const { connectToMongo, getPlayer, createPlayer } = require('./src/core/player/playerService');
const { getMainMenuText } = require('./src/utils/helpers');
const { mainMenu } = require('./src/menus/mainMenu');
const assets = require('./src/data/assets');

/*
=================================
IMPORTS HANDLERS
=================================
*/

const profile = require('./src/handlers/profile');
const inventory = require('./src/handlers/inventory');
const combat = require('./src/handlers/combat');
const travel = require('./src/handlers/travel');
const energy = require('./src/handlers/energy');
const vip = require('./src/handlers/vip');
const daily = require('./src/handlers/daily');
const online = require('./src/handlers/online');
const ranking = require('./src/handlers/ranking');
const dungeon = require('./src/handlers/dungeon');
const shop = require('./src/handlers/shop');
const arena = require('./src/handlers/arena');
const arenaShop = require('./src/handlers/arenaShop');

/*
=================================
IMPORTS COMMANDS
=================================
*/

const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const { handleEquip, handleEquipSoulCommand } = require('./src/commands/equip');
const resetCommands = require('./src/commands/reset');
const adminCommands = require('./src/commands/admin');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on('photo', adminCommands.handleCapturePhoto);

let launched = false;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

/*
=================================
CENA DE CRIAÇÃO DE PERSONAGEM
=================================
*/

const creationSessions = new Map();

function isValidName(name) {
    const trimmed = name.trim();
    return trimmed.length >= 3 && trimmed.length <= 20;
}

bot.use(async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();

    const userId = String(ctx.from.id);
    const session = creationSessions.get(userId);

    if (!session) return next();

    if (session.step === 'awaiting_name') {
        const rawName = ctx.message.text.trim();

        if (!isValidName(rawName)) {
            return ctx.reply('❌ O nome deve ter entre *3 e 20 caracteres*. Tente novamente:', {
                parse_mode: 'Markdown'
            });
        }

        session.name = rawName;
        session.step = 'awaiting_class';
        creationSessions.set(userId, session);

        const classKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('⚔️ Guerreiro', 'choose_class_guerreiro')],
            [Markup.button.callback('🏹 Arqueiro', 'choose_class_arqueiro')],
            [Markup.button.callback('🔮 Mago', 'choose_class_mago')]
        ]);

        return ctx.reply(`Ótimo, *${rawName}*! Agora escolha sua classe:`, {
            parse_mode: 'Markdown',
            ...classKeyboard
        });
    }

    if (session.step === 'awaiting_class') {
        return ctx.reply('Por favor, escolha uma classe usando os botões acima.');
    }

    return next();
});

async function finalizeCharacterCreation(ctx, userId, name, className) {
    try {
        const player = await createPlayer(userId, name, className);
        creationSessions.delete(userId);

        await ctx.reply(`✨ Personagem criado com sucesso! Bem-vindo a Noctra, *${player.name}*!`, {
            parse_mode: 'Markdown'
        });

        await sendMainMenu(ctx, userId, player.name, false);
    } catch (error) {
        console.error('Erro ao criar personagem:', error);
        await ctx.reply('❌ Ocorreu um erro ao criar seu personagem. Tente novamente com /start.');
        creationSessions.delete(userId);
    }
}

/*
=================================
MIDDLEWARE ANTI-BAN
=================================
*/

bot.use(async (ctx, next) => {
    if (ctx.from) {
        try {
            const player = await getPlayer(ctx.from.id);
            if (player && player.banned) {
                return ctx.reply('⛔ Você está banido do Noctra.');
            }
        } catch {
            // jogador ainda não existe
        }
    }

    return next();
});

/*
=================================
ERROR HANDLER GLOBAL
=================================
*/

bot.catch((err, ctx) => {
    console.error('❌ ERRO GLOBAL:', err);

    if (ctx?.reply) {
        ctx.reply('⚠️ Algo deu errado no mundo de Noctra.');
    }
});

/*
=================================
HELPERS
=================================
*/

function bindCommand(name, handler) {
    if (typeof handler !== 'function') {
        console.log(`⚠️ Handler ausente para /${name}`);
        return;
    }
    bot.command(name, handler);
}

function bindAction(pattern, handler) {
    if (typeof handler !== 'function') {
        console.log(`⚠️ Handler ausente para action: ${pattern}`);
        return;
    }
    bot.action(pattern, handler);
}

async function sendMainMenu(ctx, userId, username, editMode = false) {
    const menuText = await getMainMenuText(userId, username);
    const player = await getPlayer(userId);
    const mapImage = player?.currentMap ? assets?.maps?.[player.currentMap] : null;
    const keyboard = mainMenu();

    if (!editMode) {
        if (mapImage) {
            return ctx.replyWithPhoto(mapImage, {
                caption: menuText,
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        return ctx.reply(menuText, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    const chatId = ctx.chat.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
        if (mapImage && messageId) {
            await ctx.telegram.editMessageMedia(chatId, messageId, null, {
                type: 'photo',
                media: mapImage,
                caption: menuText,
                parse_mode: 'Markdown'
            }, {
                reply_markup: keyboard.reply_markup
            });
            return;
        }

        await ctx.editMessageText(menuText, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        if (mapImage) {
            return ctx.replyWithPhoto(mapImage, {
                caption: menuText,
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        return ctx.reply(menuText, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

/*
=================================
BOT STARTUP
=================================
*/

async function startBot() {
    if (launched) return;
    launched = true;

    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook removido');

        await sleep(3000);
        await connectToMongo();
        console.log('✅ MongoDB conectado');

        await bot.launch({ dropPendingUpdates: true });
        console.log('🌑 NOCTRA ONLINE');
    } catch (err) {
        console.error('