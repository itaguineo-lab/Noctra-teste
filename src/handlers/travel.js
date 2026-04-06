const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { maps, getMapById, canPlayerEnter } = require('../core/world/maps');

function buildTravelMenu(player) {
    const rows = [];
    maps.forEach(map => {
        const unlocked = canPlayerEnter(player, map.id);
        const isCurrent = player.currentMap === map.id;
        let label = `${map.emoji} ${map.name} (Lv ${map.levelReq})`;
        if (isCurrent) label = `📍 ${label}`;
        if (!unlocked) label = `🔒 ${label}`;
        rows.push([Markup.button.callback(label, unlocked ? `travel_to_${map.id}` : 'travel_locked')]);
    });
    rows.push([Markup.button.callback('🏠 Menu', 'menu')]);
    return Markup.inlineKeyboard(rows);
}

function renderTravelText(player) {
    const currentMap = getMapById(player.currentMap) || maps[0];
    return `🗺️ *VIAGEM*\n\n📍 Mapa atual: *${currentMap.emoji} ${currentMap.name}*\n🎖️ Nível: ${player.level}\n\n${currentMap.description}\n\nEscolha seu destino:`;
}

async function safeEdit(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
        }
        return await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    } catch {
        return await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
}

async function handleTravel(ctx) {
    const player = await getPlayer(ctx.from.id, ctx.from.first_name);
    if (!player.currentMap) {
        player.currentMap = maps[0].id;
        await savePlayer(ctx.from.id, player);
    }
    return safeEdit(ctx, renderTravelText(player), buildTravelMenu(player));
}

async function handleTravelTo(ctx) {
    try {
        await ctx.answerCbQuery();
        const mapId = ctx.match?.[1];
        if (!mapId) return ctx.answerCbQuery('❌ Destino inválido', { show_alert: true });
        const map = getMapById(mapId);
        if (!map) return ctx.answerCbQuery('❌ Mapa não encontrado', { show_alert: true });
        const player = await getPlayer(ctx.from.id, ctx.from.first_name);
        if (!canPlayerEnter(player, map.id)) {
            return ctx.answerCbQuery(`🔒 Requer nível ${map.levelReq}`, { show_alert: true });
        }
        player.currentMap = map.id;
        await savePlayer(ctx.from.id, player);
        return safeEdit(ctx, `🗺️ *VIAGEM CONCLUÍDA*\n\nVocê chegou em *${map.emoji} ${map.name}*\n\n${map.description}`, buildTravelMenu(player));
    } catch (error) {
        console.error('Erro ao viajar:', error);
        return ctx.reply('❌ Erro ao viajar.');
    }
}

async function handleTravelLocked(ctx) {
    return ctx.answerCbQuery('🔒 Este mapa ainda está bloqueado.', { show_alert: true });
}

async function handleDungeon(ctx) {
    await ctx.answerCbQuery();
    await ctx.reply('🏰 *MASMORRA*\n\nEm breve você poderá enfrentar desafios em grupo aqui! Por enquanto, aproveite para caçar e evoluir.', { parse_mode: 'Markdown' });
}

module.exports = { handleTravel, handleTravelTo, handleTravelLocked, handleDungeon };