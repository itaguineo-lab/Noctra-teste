const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    maps,
    getMapById,
    canPlayerEnter,
    getNextLockedMap
} = require('../core/world/maps');

/*
=================================
MENU
=================================
*/

function buildTravelMenu(player) {
    const rows = [];

    maps.forEach(map => {
        const unlocked = canPlayerEnter(
            player,
            map.id
        );

        const isCurrent =
            player.currentMap === map.id;

        let label = `${map.emoji} ${map.name} (Lv ${map.levelReq})`;

        if (isCurrent) {
            label = `📍 ${label}`;
        }

        if (!unlocked) {
            label = `🔒 ${label}`;
        }

        rows.push([
            Markup.button.callback(
                label,
                unlocked
                    ? `travel_to_${map.id}`
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

/*
=================================
TEXT
=================================
*/

function renderTravelText(player) {
    const currentMap =
        getMapById(player.currentMap) || maps[0];

    const nextMap =
        getNextLockedMap(player.level);

    let text = `🗺️ *VIAGEM*\n\n`;

    text += `📍 Atual: *${currentMap.emoji} ${currentMap.name}*\n`;
    text += `🎖️ Nível: ${player.level}\n`;
    text += `📖 ${currentMap.description}\n\n`;

    if (nextMap) {
        text += `🎯 Próximo destino: *${nextMap.emoji} ${nextMap.name}*\n`;
        text += `🔓 Desbloqueia no nível ${nextMap.levelReq}\n\n`;
    }

    text += `Escolha seu destino:`;

    return text;
}

/*
=================================
SAFE EDIT
=================================
*/

async function safeEdit(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();

            return await ctx.editMessageText(
                text,
                {
                    parse_mode: 'Markdown',
                    ...keyboard
                }
            );
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

/*
=================================
TRAVEL MENU
=================================
*/

async function handleTravel(ctx) {
    const player =
        await getPlayer(
            ctx.from.id,
            ctx.from.first_name
        );

    if (!player.currentMap) {
        player.currentMap = maps[0].id;

        await savePlayer(
            ctx.from.id,
            player
        );
    }

    return safeEdit(
        ctx,
        renderTravelText(player),
        buildTravelMenu(player)
    );
}

/*
=================================
TRAVEL TO
=================================
*/

async function handleTravelTo(ctx) {
    try {
        await ctx.answerCbQuery();

        const mapId =
            ctx.match?.[1];

        if (!mapId) {
            return ctx.answerCbQuery(
                '❌ Destino inválido',
                {
                    show_alert: true
                }
            );
        }

        const map =
            getMapById(mapId);

        if (!map) {
            return ctx.answerCbQuery(
                '❌ Mapa não encontrado',
                {
                    show_alert: true
                }
            );
        }

        const player =
            await getPlayer(
                ctx.from.id,
                ctx.from.first_name
            );

        if (
            !canPlayerEnter(
                player,
                map.id
            )
        ) {
            return ctx.answerCbQuery(
                `🔒 Requer nível ${map.levelReq}`,
                {
                    show_alert: true
                }
            );
        }

        player.currentMap = map.id;

        await savePlayer(
            ctx.from.id,
            player
        );

        const text = `🗺️ *VIAGEM CONCLUÍDA*\n\n✨ Você chegou em *${map.emoji} ${map.name}*\n\n${map.description}\n\n🏰 Masmorra: *${map.dungeonName}*`;

        return safeEdit(
            ctx,
            text,
            buildTravelMenu(player)
        );
    } catch (error) {
        console.error(
            'Erro ao viajar:',
            error
        );

        return ctx.reply(
            '❌ Erro ao viajar.'
        );
    }
}

/*
=================================
LOCKED
=================================
*/

async function handleTravelLocked(ctx) {
    return ctx.answerCbQuery(
        '🔒 Este mapa ainda está bloqueado.',
        {
            show_alert: true
        }
    );
}

/*
=================================
DUNGEON
=================================
*/

async function handleDungeon(ctx) {
    await ctx.answerCbQuery();

    const player =
        await getPlayer(ctx.from.id);

    const currentMap =
        getMapById(player.currentMap);

    return ctx.reply(
        `🏰 *${currentMap?.dungeonName || 'Masmorra'}*\n\nPrepare-se para o desafio.`,
        {
            parse_mode: 'Markdown'
        }
    );
}

module.exports = {
    handleTravel,
    handleTravelTo,
    handleTravelLocked,
    handleDungeon
};