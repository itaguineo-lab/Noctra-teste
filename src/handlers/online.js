const { getAllPlayers } = require('../core/player/playerService');

const MAP_NAMES = {
    clareira_sombria: '🌲 Clareira Sombria',
    cripta_em_ruinas: '⚰️ Cripta em Ruínas',
    pantano_corrompido: '🍄 Pântano Corrompido',
    deserto_incandescente: '🏜️ Deserto Incandescente'
};

async function handleOnline(ctx) {
    try {
        const now = Date.now();
        const activeThreshold = now - 20 * 60 * 1000; // últimos 20 minutos

        const players = await getAllPlayers();
        let onlineCount = 0;
        let playersByMap = {};

        Object.values(players).forEach(p => {
            if (p.lastActive && new Date(p.lastActive).getTime() > activeThreshold) {
                onlineCount++;
                const map = p.currentMap || 'clareira_sombria';
                playersByMap[map] = (playersByMap[map] || 0) + 1;
            }
        });

        let msg = `👥 *Jogadores Online* (últimos 20 min): ${onlineCount}\n`;
        if (Object.keys(playersByMap).length) {
            msg += `\n📍 *Por mapa:*\n`;
            for (const [mapId, count] of Object.entries(playersByMap)) {
                const mapName = MAP_NAMES[mapId] || mapId;
                msg += `   ${mapName}: ${count}\n`;
            }
        } else {
            msg += `\nNenhum jogador ativo no momento.`;
        }

        await ctx.answerCbQuery(msg, { show_alert: true });
    } catch (error) {
        console.error('Erro online:', error);
        await ctx.answerCbQuery('❌ Erro ao consultar online.', { show_alert: true });
    }
}

module.exports = { handleOnline };