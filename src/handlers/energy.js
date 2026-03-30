const {
    getPlayerSafe,
    getMainMenuText
} = require('../utils/helpers');

const {
    progressBar
} = require('../utils/formatters');

const { mainMenu } = require('../menus/mainMenu');

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function handleEnergy(ctx) {
    try {
        const player = getPlayerSafe(ctx.from.id);

        const bar = progressBar(
            player.energy,
            player.maxEnergy,
            8
        );

        let msg =
            `⚡ *Energia*: ${player.energy}/${player.maxEnergy}\n`;

        msg +=
            `[${bar}] ${Math.floor((player.energy / player.maxEnergy) * 100)}%\n\n`;

        msg +=
            `⏱️ Regeneração: ${
                player.vip
                    ? '1 a cada 3 min'
                    : '1 a cada 6 min'
            }\n`;

        msg +=
            `🧪 Compre poções na loja.\n\n`;

        msg += getMainMenuText(
            player,
            ctx.from.first_name
        );

        await safeEdit(ctx, msg, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    } catch (error) {
        console.error('Erro energia:', error);

        await ctx.answerCbQuery(
            'Erro ao mostrar energia.'
        );
    }
}

module.exports = { handleEnergy };