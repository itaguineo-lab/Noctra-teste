const { getPlayer, savePlayer } = require('../core/player/playerService');
const { updateEnergy, getTimeToNextEnergy, getRegenInterval } = require('../services/energyService');
const { progressBar, formatTime, formatDuration } = require('../utils/formatters');
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
    const interval = getRegenInterval(player);
    const energyToFull = player.maxEnergy - player.energy;
    const timeToFull = energyToFull * interval;
    const energyBar = progressBar(player.energy, player.maxEnergy, 8, '🟨', '⬜');
    const hpBar = progressBar(player.hp, player.maxHp, 8, '🟥', '⬜');
    const energyPercent = Math.floor((player.energy / player.maxEnergy) * 100);
    let text = `╔══════════════════════════════════╗
║              ⚡ *ENERGIA*              ║
╠══════════════════════════════════╣
║ ⚡ ${player.energy}/${player.maxEnergy}
║ [${energyBar}] ${energyPercent}%
╠══════════════════════════════════╣
║ ❤️ HP: ${player.hp}/${player.maxHp}
║ [${hpBar}]
╠══════════════════════════════════╣
║ ⏱️ Regeneração: ${player.vip ? '1 a cada 8 min' : '1 a cada 10 min'}
║ ⏳ Próxima energia em: ${formatTime(nextIn)}
║ 🕒 Tempo até encher: ${formatDuration(timeToFull)}
╠══════════════════════════════════╣
║ 🛌 Descansar recupera *todo HP*
║ ⚡ Custo: *1 energia*
╚══════════════════════════════════╝`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛌 Descansar (-1⚡)', 'rest_energy')],
        [Markup.button.callback('⚡ Comprar Energia (💎5 +10)', 'buy_energy')],
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

async function handleBuyEnergy(ctx) {
    try {
        await ctx.answerCbQuery();
        const player = getPlayer(ctx.from.id);
        const COST = 5;
        const AMOUNT = 10;
        if ((player.nox || 0) < COST) {
            return ctx.answerCbQuery(`❌ Você precisa de 💎 ${COST} Nox.`, { show_alert: true });
        }
        player.nox -= COST;
        player.energy = Math.min(player.maxEnergy, player.energy + AMOUNT);
        savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(`✅ +${AMOUNT} energia!`, { show_alert: true });
        return renderEnergy(ctx);
    } catch (error) {
        console.error('Erro comprar energia:', error);
        await ctx.answerCbQuery('Erro ao comprar energia.', { show_alert: true });
    }
}

module.exports = { handleEnergy, handleRestEnergy, handleBuyEnergy };