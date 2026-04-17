const { Markup } = require('telegraf');
const { getAllPlayers } = require('../core/player/playerService');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');

const MAP_NAMES = {
    clareira_sombria: '🌲 Clareira Sombria',
    cripta_em_ruinas: '⚰️ Cripta em Ruínas',
    pantano_corrompido: '🍄 Pântano Corrompido',
    deserto_incandescente: '🏜️ Deserto Incandescente',
    citadela_lunar: '🌙 Citadela Lunar',
    abismo_noctra: '🌑 Abismo de Noctra'
};

function onlineKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Atualizar', 'online')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

async function handleOnline(ctx) {
    try {
        await safeAnswer(ctx);

        const now = Date.now();
        const activeThreshold = now - 20 * 60 * 1000;

        const players = await getAllPlayers();
        let onlineCount = 0;
        const playersByMap = {};

        Object.values(players).forEach((p) => {
            if (p.lastActive && new Date(p.lastActive).getTime() > activeThreshold) {
                onlineCount++;
                const map = p.currentMap || 'clareira_sombria';
                playersByMap[map] = (playersByMap[map] || 0) + 1;
            }
        });

        let msg = `👥 *JOGADORES ONLINE*\n\n`;
        msg += `Ativos nos últimos 20 min: *${onlineCount}*\n\n`;

        if (Object.keys(playersByMap).length) {
            msg += `📍 *Por mapa:*\n`;
            for (const [mapId, count] of Object.entries(playersByMap)) {
                const mapName = MAP_NAMES[mapId] || mapId;
                msg += `• ${mapName}: ${count}\n`;
            }
        } else {
            msg += `Nenhum jogador ativo no momento.`;
        }

        return navigateText(ctx, msg, {
            parse_mode: 'Markdown',
            ...onlineKeyboard()
        });
    } catch (error) {
        console.error('Erro online:', error);
        return safeAnswer(ctx, '❌ Erro ao consultar online.', { show_alert: true });
    }
}

module.exports = { handleOnline };