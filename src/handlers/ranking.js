const { getAllPlayers } = require('../core/player/playerService');
const { Markup } = require('telegraf');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');

/*
=================================
HELPERS
=================================
*/

function getMedal(index) {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || '▫️';
}

function calculatePower(player) {
    return Math.floor(
        (player.level || 1) * 10 +
        (player.atk || 0) * 2 +
        (player.def || 0) * 1.5 +
        (player.maxHp || 0) * 0.2
    );
}

function formatSection(title, list, formatter) {
    let text = `*${title}:*\n`;

    if (!list.length) {
        return text + `Nenhum jogador.\n`;
    }

    list.forEach((player, index) => {
        const medal = getMedal(index);
        text += `${medal} ${index + 1}. ${formatter(player)}\n`;
    });

    return text + '\n';
}

/*
=================================
HANDLER
=================================
*/

async function handleRanking(ctx) {
    try {
        await safeAnswer(ctx);

        const players = await getAllPlayers();
        const list = players
            .filter(player => player && player.id)
            .map(player => ({
                id: player.id,
                name: player.name || 'Desconhecido',
                level: player.level || 1,
                kills: player.totalKills || 0,
                power: calculatePower(player)
            }));

        const topLevel = [...list]
            .sort((a, b) => b.level - a.level)
            .slice(0, 10);

        const topKills = [...list]
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 10);

        const topPower = [...list]
            .sort((a, b) => b.power - a.power)
            .slice(0, 10);

        let msg = `🏆 *RANKING GLOBAL — NOCTRA*\n\n`;

        msg += formatSection(
            '📈 Top Nível',
            topLevel,
            player => `${player.name} — Nv ${player.level}`
        );

        msg += formatSection(
            '⚔️ Top Abates',
            topKills,
            player => `${player.name} — ${player.kills} kills`
        );

        msg += formatSection(
            '🔥 Top Poder',
            topPower,
            player => `${player.name} — ${player.power} power`
        );

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Atualizar', 'ranking')],
            [Markup.button.callback('◀️ Voltar', 'menu')]
        ]);

        return navigateText(ctx, msg, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (error) {
        console.error('Erro ranking:', error);
        return safeAnswer(ctx, '❌ Erro ao carregar ranking.', { show_alert: true });
    }
}

module.exports = {
    handleRanking
};