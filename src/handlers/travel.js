const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const MAPS = {
    clareira_sombria: {
        name: '🌑 Clareira Sombria',
        levelRequired: 1,
        description: 'Início da jornada, inimigos fracos e almas básicas.'
    },
    floresta_morta: {
        name: '🌲 Floresta Morta',
        levelRequired: 5,
        description: 'Criaturas sombrias e drops raros.'
    },
    castelo_esquecido: {
        name: '🏰 Castelo Esquecido',
        levelRequired: 10,
        description: 'Inimigos elite e chance de almas épicas.'
    },
    arena_das_sombras: {
        name: '⚔️ Arena das Sombras',
        levelRequired: 15,
        description: 'PvE avançado e chefes.'
    }
};

function buildTravelMenu(player) {
    const rows = [];

    Object.entries(MAPS).forEach(([key, map]) => {
        const unlocked = player.level >= map.levelRequired;
        const isCurrent = player.currentMap === key;

        let label = map.name;

        if (isCurrent) {
            label = `📍 ${label}`;
        } else if (!unlocked) {
            label = `🔒 ${label}`;
        }

        rows.push([
            Markup.button.callback(
                label,
                unlocked
                    ? `travel_to_${key}`
                    : 'travel_locked'
            )
        ]);
    });

    rows.push([
        Markup.button.callback(
            '🏠 Menu',
            'menu'
        )
    ]);

    return Markup.inlineKeyboard(rows);
}

function renderTravelText(player) {
    const currentMap =
        MAPS[player.currentMap] || MAPS.clareira_sombria;

    return `🗺️ *VIAGEM*

📍 Mapa atual: *${currentMap.name}*
🎖️ Nível: ${player.level}

${currentMap.description}

Escolha seu destino:`;
}

async function safeEdit(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return await ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        return await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        return await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

async function handleTravel(ctx) {
    const player = getPlayer(
        ctx.from.id,
        ctx.from.first_name
    );

    if (!player.currentMap) {
        player.currentMap = 'clareira_sombria';
        savePlayer(ctx.from.id, player);
    }

    return safeEdit(
        ctx,
        renderTravelText(player),
        buildTravelMenu(player)
    );
}

async function handleTravelTo(ctx) {
    try {
        await ctx.answerCbQuery();

        const match =
            ctx.callbackQuery.data.match(/^travel_to_(.+)$/);

        if (!match) {
            return ctx.answerCbQuery(
                '❌ Destino inválido',
                { show_alert: true }
            );
        }

        const mapKey = match[1];
        const destination = MAPS[mapKey];

        if (!destination) {
            return ctx.answerCbQuery(
                '❌ Mapa não encontrado',
                { show_alert: true }
            );
        }

        const player = getPlayer(
            ctx.from.id,
            ctx.from.first_name
        );

        if (player.level < destination.levelRequired) {
            return ctx.answerCbQuery(
                `🔒 Requer nível ${destination.levelRequired}`,
                { show_alert: true }
            );
        }

        player.currentMap = mapKey;
        savePlayer(ctx.from.id, player);

        return safeEdit(
            ctx,
            `🗺️ *VIAGEM CONCLUÍDA*

Você chegou em *${destination.name}*

${destination.description}`,
            buildTravelMenu(player)
        );
    } catch (error) {
        console.error('Erro ao viajar:', error);

        return ctx.reply(
            '❌ Erro ao viajar.'
        );
    }
}

async function handleTravelLocked(ctx) {
    return ctx.answerCbQuery(
        '🔒 Este mapa ainda está bloqueado.',
        { show_alert: true }
    );
}

module.exports = {
    handleTravel,
    handleTravelTo,
    handleTravelLocked,
    MAPS
};