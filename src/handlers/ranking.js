const { getAllPlayers } = require('../core/player/playerService');
const { Markup } = require('telegraf');

async function handleRanking(ctx) {
    const players = await getAllPlayers();
    const list = Object.values(players)
        .filter(p => p && p.id)
        .map(p => ({
            id: p.id,
            name: p.name || 'Desconhecido',
            level: p.level || 1,
            kills: p.totalKills || 0
        }));

    const topLevel = [...list].sort((a,b) => b.level - a.level).slice(0,10);
    const topKills = [...list].sort((a,b) => b.kills - a.kills).slice(0,10);

    let msg = `🏆 *RANKING GLOBAL*\n\n`;
    msg += `*📈 Por Nível:*\n`;
    topLevel.forEach((p, idx) => {
        msg += `${idx+1}. ${p.name} - Nv ${p.level}\n`;
    });
    msg += `\n*⚔️ Por Abates:*\n`;
    topKills.forEach((p, idx) => {
        msg += `${idx+1}. ${p.name} - ${p.kills} kills\n`;
    });

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);

    if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...keyboard });
    } else {
        await ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
    }
}

module.exports = { handleRanking };