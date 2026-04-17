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

const assets = require('../data/assets');
const { navigateScreen, safeAnswer } = require('../utils/uiNavigator');

/*
=================================
MENU
=================================
*/

function buildTravelMenu(player) {
    const rows = [];

    maps.forEach(map => {
        const unlocked = canPlayerEnter(player, map.id);
        const isCurrent = player.currentMap === map.id;

        let label = `${map.emoji} ${map.name} (Lv ${map.levelReq})`;
        if (isCurrent) label = `📍 ${label}`;
        if (!unlocked) label = `🔒 ${label}`;

        rows.push([
            Markup.button.callback(
                label,
                unlocked ? `travel_to_${map.id}` : 'travel_locked'
            )
        ]);
    });

    rows.push([Markup.button.callback('🏠 Menu', 'menu')]);

    return Markup.inlineKeyboard(rows);
}

/*
=================================
TEXT
=================================
*/

function renderTravelCaption(player) {
    const currentMap = getMapById(player.currentMap) || maps[0];
    const nextMap = getNextLockedMap(player.level);

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
SAFE SEND/EDIT
=================================
*/

async function sendOrUpdateTravelMessage(ctx, player) {
    const caption = renderTravelCaption(player);
    const keyboard = buildTravelMenu(player);
    const currentMap = player.currentMap || maps[0].id;
    const mapImage = assets?.maps?.[currentMap];

    return navigateScreen(ctx, {
        text: caption,
        media: mapImage || null,
        options: keyboard
    });
}

/*
=================================
TRAVEL MENU
=================================
*/

async function handleTravel(ctx) {
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return ctx.reply('🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    if (!player.currentMap) {
        player.currentMap = maps[0].id;
        await savePlayer(ctx.from.id, player);
    }

    return sendOrUpdateTravelMessage(ctx, player);
}

/*
=================================
TRAVEL TO
=================================
*/

async function handleTravelTo(ctx) {
    try {
        await safeAnswer(ctx);

        const mapId = ctx.match?.[1];
        if (!mapId) {
            return safeAnswer(ctx, '❌ Destino inválido', { show_alert: true });
        }

        const map = getMapById(mapId);
        if (!map) {
            return safeAnswer(ctx, '❌ Mapa não encontrado', { show_alert: true });
        }

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(ctx, '🧭 Use /start para criar seu personagem.', { show_alert: true });
        }

        if (!canPlayerEnter(player, map.id)) {
            return safeAnswer(ctx, `🔒 Requer nível ${map.levelReq}`, { show_alert: true });
        }

        player.currentMap = map.id;
        await savePlayer(ctx.from.id, player);

        return sendOrUpdateTravelMessage(ctx, player);
    } catch (error) {
        console.error('Erro ao viajar:', error);
        return ctx.reply('❌ Erro ao viajar.');
    }
}

/*
=================================
LOCKED
=================================
*/

async function handleTravelLocked(ctx) {
    return safeAnswer(ctx, '🔒 Este mapa ainda está bloqueado.', { show_alert: true });
}

/*
=================================
DUNGEON
=================================
*/

async function handleDungeon(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return ctx.reply('🧭 Você ainda não criou um personagem. Use /start para começar.');
    }
    const currentMap = getMapById(player.currentMap);

    return navigateScreen(ctx, {
        text: `🏰 *${currentMap?.dungeonName || 'Masmorra'}*\n\nPrepare-se para o desafio.`,
        media: null,
        options: {
            ...Markup.inlineKeyboard([[Markup.button.callback('🏠 Menu', 'menu')]])
        }
    });
}

module.exports = {
    handleTravel,
    handleTravelTo,
    handleTravelLocked,
    handleDungeon
};