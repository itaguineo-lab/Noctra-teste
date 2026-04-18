const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    ensureDailyMissionState,
    claimAllMissionRewards,
    renderDailyMissionsText,
    areAllMissionsCompleted
} = require('../core/daily/dailyService');

const {
    renderChestHubText,
    openTimedChest
} = require('../core/chests/chestService');

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

/*
=================================
HELPERS
=================================
*/

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getYesterdayKey() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function dailyKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🎁 Baú Diário', 'daily_chest'),
            Markup.button.callback('📜 Resgatar Missões', 'daily_claim_missions')
        ],
        [
            Markup.button.callback('📦 Meus Baús', 'daily_chests'),
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

async function sendDailyScreen(ctx, text, options = {}) {
    return navigateText(ctx, text, {
        parse_mode: 'Markdown',
        ...options
    });
}

function getStreakTier(streak = 0) {
    if (streak >= 14) return '🌟 Lendário';
    if (streak >= 7) return '🏅 Semanal';
    if (streak >= 3) return '⭐ Consistente';
    if (streak >= 1) return '🔥 Em progresso';
    return '🌑 Inativo';
}

/*
=================================
REWARD ENGINE (BAÚ DIÁRIO)
=================================
*/

function giveDailyChest(player) {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    if (player.lastDailyChest === today) {
        return null;
    }

    if (player.lastDailyChest === yesterday) {
        player.dailyStreak = (player.dailyStreak || 0) + 1;
    } else {
        player.dailyStreak = 1;
    }

    player.lastDailyChest = today;
    const streak = player.dailyStreak;

    let gold = 100 + player.level * 20;
    let glorias = 0;

    if (streak >= 3) gold += 50;
    if (streak >= 7) glorias = 1;
    if (streak >= 14) gold += 100;

    player.gold = (player.gold || 0) + gold;
    player.glorias = (player.glorias || 0) + glorias;

    return { gold, glorias, streak };
}

function renderDailyHub(player) {
    ensureDailyMissionState(player);

    const streak = player.dailyStreak || 0;
    const streakTier = getStreakTier(streak);
    const chestStatus = player.lastDailyChest === getTodayKey() ? 'ABERTO' : 'DISPONÍVEL';
    const missionStatus = areAllMissionsCompleted(player) ? 'CONCLUÍDAS' : 'EM ANDAMENTO';

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎁 *CENTRO DIÁRIO*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🔥 *Streak Atual*: ${streak} dia(s)\n`;
    text += `🏷️ Tier: ${streakTier}\n`;
    text += `📦 Baú diário: ${chestStatus}\n`;
    text += `📜 Missões: ${missionStatus}\n\n`;

    text += `🎯 *Objetivo do dia*\n`;
    text += `Abra seu baú, conclua missões e mantenha sua sequência ativa.\n\n`;

    text += `📋 *Missões*\n`;
    text += `${renderDailyMissionsText(player)}\n`;

    return text;
}

/*
=================================
HANDLERS
=================================
*/

async function handleDaily(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(
                ctx,
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        ensureDailyMissionState(player);
        await savePlayer(ctx.from.id, player);

        return sendDailyScreen(ctx, renderDailyHub(player), dailyKeyboard());
    } catch (error) {
        console.error('Erro daily:', error);
        return safeAnswer(ctx, 'Erro ao abrir centro diário.', { show_alert: true });
    }
}

async function handleDailyChest(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(
                ctx,
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        const reward = giveDailyChest(player);

        if (!reward) {
            return safeAnswer(
                ctx,
                '🎁 Você já abriu o baú hoje. Volte amanhã.',
                { show_alert: true }
            );
        }

        ensureDailyMissionState(player);
        await savePlayer(ctx.from.id, player);

        let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🎁 *BAÚ DIÁRIO ABERTO*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        msg += `💰 Ouro: +${reward.gold}\n`;
        if (reward.glorias > 0) {
            msg += `🏅 Glórias: +${reward.glorias}\n`;
        }

        msg += `🔥 Streak atual: ${reward.streak} dia(s)\n`;

        if (reward.streak === 3) msg += `⭐ Bônus de consistência desbloqueado\n`;
        if (reward.streak === 7) msg += `🏅 Bônus semanal desbloqueado\n`;
        if (reward.streak === 14) msg += `🌟 Bônus lendário desbloqueado\n`;

        msg += `\nVolte amanhã para manter sua sequência ativa.`;

        return sendDailyScreen(ctx, msg, dailyKeyboard());
    } catch (error) {
        console.error('Erro daily chest:', error);
        return safeAnswer(ctx, 'Erro ao abrir baú.', { show_alert: true });
    }
}

async function handleClaimMissionRewards(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(
                ctx,
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        ensureDailyMissionState(player);

        const result = claimAllMissionRewards(player);
        if (!result.success) {
            return safeAnswer(ctx, result.message, { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);

        let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🎉 *MISSÕES RESGATADAS*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        msg += `💰 Ouro: +${result.rewards.gold}\n`;
        msg += `✨ XP: +${result.rewards.xp}\n`;

        if (result.rewards.glorias > 0) {
            msg += `🏅 Glórias: +${result.rewards.glorias}\n`;
        }

        if (result.rewards.keys > 0) {
            msg += `🗝️ Chaves: +${result.rewards.keys}\n`;
        }

        msg += `\nContinue amanhã para manter o ritmo.`;

        return sendDailyScreen(ctx, msg, dailyKeyboard());
    } catch (error) {
        console.error('Erro mission rewards:', error);
        return safeAnswer(ctx, 'Erro ao resgatar recompensas.', { show_alert: true });
    }
}

async function handleTimedChests(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(
                ctx,
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        const text = renderChestHubText(player);
        const rows = (player.timedChests || []).map(chest => ([
            Markup.button.callback(`📦 ${chest.tier.toUpperCase()}`, `daily_open_chest:${chest.id}`)
        ]));

        rows.push([Markup.button.callback('◀️ Voltar', 'daily')]);

        return sendDailyScreen(ctx, text, Markup.inlineKeyboard(rows));
    } catch (error) {
        console.error('Erro timed chests:', error);
        return safeAnswer(ctx, 'Erro ao abrir lista de baús.', { show_alert: true });
    }
}

async function handleOpenTimedChest(ctx) {
    try {
        await safeAnswer(ctx);

        const chestId = ctx.match?.[1];
        const player = await getPlayer(ctx.from.id);

        if (!player) {
            return safeAnswer(
                ctx,
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        const result = openTimedChest(player, chestId);
        if (!result.success) {
            return safeAnswer(ctx, result.message, { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);

        let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📦 *BAÚ ABERTO*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        msg += `💰 Ouro: +${result.rewards.gold}\n`;
        msg += `✨ XP: +${result.rewards.xp}\n`;

        if (result.rewards.keys > 0) {
            msg += `🗝️ Chaves: +${result.rewards.keys}\n`;
        }

        msg += `\nRecompensa coletada com sucesso.`;

        return sendDailyScreen(ctx, msg, dailyKeyboard());
    } catch (error) {
        console.error('Erro open timed chest:', error);
        return safeAnswer(ctx, 'Erro ao abrir baú.', { show_alert: true });
    }
}

module.exports = {
    handleDaily,
    handleDailyChest,
    handleClaimMissionRewards,
    handleTimedChests,
    handleOpenTimedChest,
    giveDailyChest
};