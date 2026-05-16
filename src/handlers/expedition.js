const { getPlayer, savePlayer } = require('../core/player/playerService');
const { getMapById, maps } = require('../core/world/maps');
const { Markup } = require('telegraf');
const { navigateScreen, safeAnswer } = require('../utils/uiNavigator');
const { formatDuration } = require('../utils/formatters');
const assets = require('../data/assets');

const EXPEDITION_DURATIONS = [
    { id: 'short', label: 'Curta (4h)', ms: 4 * 60 * 60 * 1000 },
    { id: 'medium', label: 'Média (8h)', ms: 8 * 60 * 60 * 1000 },
    { id: 'long', label: 'Longa (12h)', ms: 12 * 60 * 60 * 1000 }
];

async function handleExpeditionMenu(ctx) {
    await safeAnswer(ctx);
    const player = await getPlayer(ctx.from.id);
    if (!player) return;

    if (player.expedition?.active) {
        return renderActiveExpedition(ctx, player);
    }

    return renderExpeditionSetup(ctx, player);
}

function renderExpeditionSetup(ctx, player) {
    const map = getMapById(player.currentMap) || maps[0];
    
    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏹 *EXPEDIÇÕES DE ALMAS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Envie uma de suas almas para explorar a região de *${map.name}* enquanto você descansa.\n\n`;
    text += `💎 *Recompensas:* Ouro, XP e chance de itens do mapa.\n`;
    text += `⚠️ *Nota:* A alma enviada não poderá ser usada em combate até retornar.\n\n`;
    text += `Escolha a duração:`;

    const keyboard = Markup.inlineKeyboard(
        EXPEDITION_DURATIONS.map(d => [Markup.button.callback(d.label, `exp_start:${d.id}`)])
        .concat([[Markup.button.callback('◀️ Voltar', 'menu')]])
    );

    return navigateScreen(ctx, {
        text,
        media: assets?.maps?.[player.currentMap] || null,
        options: keyboard
    });
}

async function handleStartExpedition(ctx) {
    const durationId = ctx.match?.[1];
    const duration = EXPEDITION_DURATIONS.find(d => d.id === durationId);
    
    const player = await getPlayer(ctx.from.id);
    if (!player || !duration) return;

    if (player.expedition?.active) {
        return ctx.answerCbQuery('Você já tem uma expedição ativa!', { show_alert: true });
    }

    // Protótipo: Usa a primeira alma equipada ou uma padrão se não houver
    const soul = player.soulsEquipped?.[0] || { name: 'Sombra do Herói' };

    player.expedition = {
        active: true,
        mapId: player.currentMap,
        soulId: soul.id || 'hero_shadow',
        soulName: soul.name,
        startTime: Date.now(),
        duration: duration.ms,
        claimed: false
    };

    await savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`🚀 Expedição iniciada! Retorne em ${duration.label}.`);
    
    return renderActiveExpedition(ctx, player);
}

function renderActiveExpedition(ctx, player) {
    const exp = player.expedition;
    const elapsed = Date.now() - exp.startTime;
    const remaining = Math.max(0, exp.duration - elapsed);
    const isReady = remaining <= 0;

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏹 *EXPEDIÇÃO EM CURSO*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `👻 Alma: *${exp.soulName}*\n`;
    text += `🗺️ Local: *${getMapById(exp.mapId)?.name || 'Desconhecido'}*\n\n`;

    if (isReady) {
        text += `✅ *EXPEDIÇÃO CONCLUÍDA!*\nSua alma retornou com tesouros da escuridão.`;
    } else {
        text += `⏳ Tempo restante: *${formatDuration(remaining)}*\n`;
        text += `Sua alma está explorando as profundezas...`;
    }

    const keyboard = Markup.inlineKeyboard([
        isReady 
            ? [Markup.button.callback('🎁 Coletar Recompensas', 'exp_claim')]
            : [Markup.button.callback('🔄 Atualizar', 'expedition')],
        [Markup.button.callback('🏠 Menu Principal', 'menu')]
    ]);

    return navigateScreen(ctx, {
        text,
        media: assets?.maps?.[exp.mapId] || null,
        options: keyboard
    });
}

async function handleClaimExpedition(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player || !player.expedition?.active) return;

    const elapsed = Date.now() - player.expedition.startTime;
    if (elapsed < player.expedition.duration) {
        return ctx.answerCbQuery('A expedição ainda não terminou!', { show_alert: true });
    }

    // Recompensas baseadas na duração (Simulação)
    const hours = player.expedition.duration / (60 * 60 * 1000);
    const goldReward = Math.floor(hours * 50 * (player.level * 0.5));
    const xpReward = Math.floor(hours * 100 * (player.level * 0.5));

    player.gold += goldReward;
    player.xp += xpReward;
    player.expedition = { active: false }; // Reseta

    await savePlayer(ctx.from.id, player);
    
    await ctx.answerCbQuery(`🎁 Você recebeu ${goldReward} de Ouro e ${xpReward} de XP!`, { show_alert: true });
    return handleExpeditionMenu(ctx);
}

module.exports = {
    handleExpeditionMenu,
    handleStartExpedition,
    handleClaimExpedition
};
