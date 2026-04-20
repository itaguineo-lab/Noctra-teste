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

const ONLINE_KEYBOARD = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Atualizar', 'online')],
    [Markup.button.callback('🏠 Menu', 'menu')]
]);

async function handleOnline(ctx) {
    try {
        await safeAnswer(ctx);

        const activeThreshold = Date.now() - (20 * 60 * 1000);
        const players = await getAllPlayers();

        let onlineCount = 0;
        const playersByMap = Object.create(null);

        for (const player of players) {
            const lastActive = player?.lastActive ? new Date(player.lastActive).getTime() : 0;
            if (!lastActive || lastActive <= activeThreshold) continue;

            onlineCount += 1;
            const mapId = player.currentMap || 'clareira_sombria';
            playersByMap[mapId] = (playersByMap[mapId] || 0) + 1;
        }

        let msg = `👥 *JOGADORES ONLINE*\n\n`;
        msg += `Ativos nos últimos 20 min: *${onlineCount}*\n\n`;

        const mapEntries = Object.entries(playersByMap);
        if (mapEntries.length) {
            msg += `📍 *Por mapa:*\n`;
            for (const [mapId, count] of mapEntries) {
                msg += `• ${MAP_NAMES[mapId] || mapId}: ${count}\n`;
            }
        } else {
            msg += `Nenhum jogador ativo no momento.`;
        }

        return navigateText(ctx, msg, {
            parse_mode: 'Markdown',
            ...ONLINE_KEYBOARD
        });
    } catch (error) {
        console.error('Erro online:', error);
        return safeAnswer(ctx, '❌ Erro ao consultar online.', { show_alert: true });
    }
}

module.exports = { handleOnline };
