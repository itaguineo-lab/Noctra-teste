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
HELPERS
=================================
*/

function getMapPowerText(map) {
    return map?.recommendedPower ? `Poder sugerido: ${map.recommendedPower}` : 'Poder sugerido: —';
}

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

    rows.push([
        Markup.button.callback('🏰 Masmorra', 'dungeon'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

function renderTravelCaption(player) {
    const currentMap = getMapById(player.currentMap) || maps[0];
    const nextMap = getNextLockedMap(player.level);

    let text = `🗺️ *VIAGEM*\n\n`;
    text += `📍 Atual: *${currentMap.emoji} ${currentMap.name}*\n`;
    text += `🎖️ Nível: ${player.level}\n`;
    text += `🔥 ${getMapPowerText(currentMap)}\n`;
    text += `📖 ${currentMap.description}\n\n`;

    if (nextMap) {
        text += `🎯 Próximo destino: *${nextMap.emoji} ${nextMap.name}*\n`;
        text += `🔓 Desbloqueia no nível ${nextMap.levelReq}\n`;
        text += `🔥 ${getMapPowerText(nextMap)}\n\n`;
    } else {
        text += `👑 Você já alcançou a região mais avançada disponível.\n\n`;
    }

    text += `Escolha seu destino:`;
    return text;
}

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
    await safeAnswer(ctx);

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
            return safeAnswer(ctx, '❌ Destino inválido.', { show_alert: true });
        }

        const map = getMapById(mapId);
        if (!map) {
            return safeAnswer(ctx, '❌ Mapa não encontrado.', { show_alert: true });
        }

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(ctx, '🧭 Use /start para criar seu personagem.', { show_alert: true });
        }

        if (!canPlayerEnter(player, map.id)) {
            return safeAnswer(ctx, `🔒 Requer nível ${map.levelReq}.`, { show_alert: true });
        }

        if (player.currentMap === map.id) {
            return safeAnswer(ctx, `📍 Você já está em ${map.name}.`, { show_alert: true });
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

    const currentMap = getMapById(player.currentMap) || maps[0];

    const text = `🏰 *${currentMap?.dungeonName || 'Masmorra'}*\n\n` +
        `📍 Região: ${currentMap.emoji} ${currentMap.name}\n` +
        `🔥 ${getMapPowerText(currentMap)}\n\n` +
        `Prepare-se para o desafio.\n` +
        `A masmorra ainda será aprofundada nas próximas sprints.`;

    return navigateScreen(ctx, {
        text,
        media: null,
        options: Markup.inlineKeyboard([
            [Markup.button.callback('🗺️ Voltar para viagem', 'travel')],
            [Markup.button.callback('🏠 Menu', 'menu')]
        ])
    });
}

module.exports = {
    handleTravel,
    handleTravelTo,
    handleTravelLocked,
    handleDungeon
};