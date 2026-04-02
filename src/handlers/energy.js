const { getPlayer, savePlayer } = require('../core/player/playerService');
const { updateEnergy, getTimeToNextEnergy } = require('../services/energyService');
const { progressBar, formatTime } = require('../utils/formatters');
const { Markup } = require('telegraf');

async function safeEdit(ctx, text, options = {}) {
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

async function renderEnergy(ctx) {
    const player = getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Perfil não encontrado.');

    updateEnergy(player);
    const nextIn = getTimeToNextEnergy(player);
    const energyBar = progressBar(player.energy, player.maxEnergy, 8, '🟨', '⬜');
    const hpBar = progressBar(player.hp, player.maxHp, 8, '🟥', '⬜');
    const energyPercent = Math.floor((player.energy / player.maxEnergy) * 100);

    let text = `╔════════════════════════╗\n`;
    text += `║       ⚡ *ENERGIA*       ║\n`;
    text += `╠════════════════════════╣\n`;
    text += `║ ⚡ ${player.energy}/${player.maxEnergy}\n`;
    text += `║ [${energyBar}] ${energyPercent}%\n`;
    text += `╠════════════════════════╣\n`;
    text += `║ ❤️ HP: ${player.hp}/${player.maxHp}\n`;
    text += `║ [${hpBar}]\n`;
    text += `╠════════════════════════╣\n`;
    text += `║ ⏱️ Regeneração: ${player.vip ? '1 a cada 8 min' : '1 a cada 10 min'}\n`;
    if (nextIn > 0) {
        text += `║ ⏳ Próxima energia em: ${formatTime(nextIn)}\n`;
    } else {
        text += `║ ✅ Energia cheia!\n`;
    }
    text += `╠════════════════════════╣\n`;
    text += `║ 🛌 Descansar recupera *todo HP*\n`;
    text += `║ ⚡ Custo: *1 energia*\n`;
    text += `╚════════════════════════╝`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛌 Descansar (-1⚡)', 'rest_energy')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);

    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleEnergy(ctx) { return renderEnergy(ctx); }

async function handleRestEnergy(ctx) {
    try {
        const player = getPlayer(ctx.from.id);
        if (!player) return ctx.answerCbQuery('Perfil não encontrado.', { show_alert: true });
        if (player.hp >= player.maxHp) return ctx.answerCbQuery('❤️ HP já está cheio.', { show_alert: true });
        if (player.energy < 1) return ctx.answerCbQuery('⚡ Energia insuficiente.', { show_alert: true });

        player.energy -= 1;
        player.hp = player.maxHp;
        savePlayer(ctx.from.id, player);
        return renderEnergy(ctx);
    } catch (error) {
        console.error('Erro ao descansar:', error);
        await ctx.answerCbQuery('Erro ao descansar.', { show_alert: true });
    }
}

module.exports = { handleEnergy, handleRestEnergy };
