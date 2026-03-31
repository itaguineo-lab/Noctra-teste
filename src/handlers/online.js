const { playersCache } = require('../core/player/playerService');

async function handleOnline(ctx) {
    try {
        const now = Date.now();
        const activeThreshold = now - 20 * 60 * 1000; // últimos 20 minutos

        // Se playersCache não estiver disponível (deve ser exportado em playerService)
        // Vamos usar um getter global – mas por enquanto, vamos acessar diretamente
        // Para evitar modificar playerService agora, podemos criar uma função auxiliar
        // Mas vamos simular: no playerService, exportar playersCache
        // Para funcionar, precisamos exportar playersCache em playerService.js
        // Vamos adaptar o playerService para exportar a cache

        // Por enquanto, assumindo que playersCache está disponível globalmente
        const players = require('../core/player/playerService').playersCache;
        let onlineCount = 0;
        let playersByMap = {};

        if (players) {
            Object.values(players).forEach(p => {
                if (p.lastActive && p.lastActive > activeThreshold) {
                    onlineCount++;
                    const map = p.currentMap || 'clareira_sombria';
                    playersByMap[map] = (playersByMap[map] || 0) + 1;
                }
            });
        }

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