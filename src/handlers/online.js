const { getAllPlayers } = require('../core/player/playerService');

async function handleOnline(ctx) {
    try {
        const now = Date.now();
        const activeThreshold = now - 20 * 60 * 1000; // últimos 20 minutos

        const players = await getAllPlayers();
        let onlineCount = 0;
        let playersByMap = {};

        Object.values(players).forEach(p => {
            if (p.lastActive && p.lastActive > activeThreshold) {
                onlineCount++;
                const map = p.currentMap || 'clareira_sombria';
                playersByMap[map] = (playersByMap[map] || 0) + 1;
            }
        });

        let msg = `👥 *Online* (últimos 20 min): ${onlineCount}\n`;
        if (Object.keys(playersByMap).length) {
            msg += `\n📍 *Por mapa:*\n`;
            for (const [map, count] of Object.entries(playersByMap)) {
                msg += `   ${map}: ${count}\n`;
            }
        } else {
            msg += `\nNenhum jogador ativo no momento.`;
        }

        await ctx.answerCbQuery(msg, { show_alert: true });
    } catch (error) {
        console.error('Erro online:', error);
        await ctx.answerCbQuery('Erro ao consultar online.', { show_alert: true });
    }
}

module.exports = { handleOnline };