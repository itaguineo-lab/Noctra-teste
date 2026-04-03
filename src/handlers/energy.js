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
    let player = getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Perfil não encontrado.');
    updateEnergy(player);
    savePlayer(ctx.from.id, player);
    
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
║ 💎 Comprar energia na LOJA (5 Nox +10)
╚══════════════════════════════════╝`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛌 Descansar (-1⚡)', 'rest_energy')],
        [Markup.button.callback('🛒 Ir à Loja', 'shop')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleEnergy(ctx) { return renderEnergy(ctx); }

async function handleRestEnergy(ctx) {
    try {
        let player = getPlayer(ctx.from.id);
        updateEnergy(player);
        if (!player) return ctx.answerCbQuery('Perfil não encontrado.', { show_alert: true });
        if (player.hp >= player.maxHp) return ctx.answerCbQuery('❤️ HP já está cheio.', { show_alert: true });
        if (player.energy < 1) return ctx.answerCbQuery('⚡ Energia insuficiente.', { show_alert: true });
        player.energy -= 1;
        player.hp = player.maxHp;
        savePlayer(ctx.from.id, player);
        
        const { checkMissionProgress } = require('./daily');
        checkMissionProgress(player, 'energy', 1);
        
        return renderEnergy(ctx);
    } catch (error) {
        console.error('Erro ao descansar:', error);
        await ctx.answerCbQuery('Erro ao descansar.', { show_alert: true });
    }
}

// REMOVIDO handleBuyEnergy – usar a loja normal

module.exports = { handleEnergy, handleRestEnergy };