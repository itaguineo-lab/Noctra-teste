const { getAllPlayers } = require('../core/player/playerService');
const { Markup } = require('telegraf');

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

async function safeSend(ctx, msg, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();

            return await ctx.editMessageText(msg, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        return await ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (error) {
        console.error('Erro ranking UI:', error);

        return await ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

/*
=================================
HANDLER
=================================
*/

async function handleRanking(ctx) {
    try {
        const playersMap = await getAllPlayers();

        const list = Object.values(playersMap || {})
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
            [Markup.button.callback('◀️ Voltar', 'menu')]
        ]);

        return safeSend(ctx, msg, keyboard);
    } catch (error) {
        console.error('Erro ranking:', error);

        return ctx.reply(
            '❌ Erro ao carregar ranking.'
        );
    }
}

module.exports = {
    handleRanking
};