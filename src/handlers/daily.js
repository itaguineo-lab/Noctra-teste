const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    mainMenu
} = require('../menus/mainMenu');

const {
    ensureDailyMissionState,
    claimAllMissionRewards,
    renderDailyMissionsText,
    areAllMissionsCompleted
} = require('../core/daily/dailyService');

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

async function safeEdit(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            return await ctx.editMessageText(text, options);
        }
        return await ctx.reply(text, options);
    } catch {
        return await ctx.reply(text, options);
    }
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

    let text = `╔══════════════════════════════╗\n`;
    text += `║        🎁 *CENTRO DIÁRIO*         ║\n`;
    text += `╠══════════════════════════════╣\n`;
    text += `║ 🔥 Streak atual: ${player.dailyStreak || 0}\n`;
    text += `║ 📦 Baú diário: ${player.lastDailyChest === getTodayKey() ? 'ABERTO' : 'DISPONÍVEL'}\n`;
    text += `║ 📜 Missões: ${areAllMissionsCompleted(player) ? 'CONCLUÍDAS' : 'EM ANDAMENTO'}\n`;
    text += `╠══════════════════════════════╣\n`;
    text += `${renderDailyMissionsText(player)}\n`;

    return text;
}

/*
=================================
HANDLER
=================================
*/

async function handleDaily(ctx) {
    try {
        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return ctx.answerCbQuery(
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        ensureDailyMissionState(player);
        await savePlayer(ctx.from.id, player);

        const text = renderDailyHub(player);

        return safeEdit(ctx, text, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    } catch (error) {
        console.error('Erro daily:', error);
        try {
            return ctx.answerCbQuery('Erro ao abrir centro diário.', { show_alert: true });
        } catch {
            return ctx.reply('Erro ao abrir centro diário.');
        }
    }
}

async function handleDailyChest(ctx) {
    try {
        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return ctx.answerCbQuery(
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        const reward = giveDailyChest(player);

        if (!reward) {
            return ctx.answerCbQuery(
                '🎁 Você já abriu o baú hoje. Volte amanhã.',
                { show_alert: true }
            );
        }

        ensureDailyMissionState(player);
        await savePlayer(ctx.from.id, player);

        let msg = `╔════════════════════════╗\n`;
        msg += `║      🎁 *BAÚ DIÁRIO*      ║\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ 📦 Recompensas\n`;
        msg += `║\n`;
        msg += `║ 💰 +${reward.gold} ouro`;

        if (reward.glorias > 0) {
            msg += `\n║ 🏅 +${reward.glorias} glória`;
        }

        msg += `\n║\n`;
        msg += `║ 🔥 Streak: ${reward.streak} dia(s)`;

        if (reward.streak === 3) msg += `\n║ ⭐ Bônus 3 dias!`;
        if (reward.streak === 7) msg += `\n║ 🏅 Bônus semanal!`;
        if (reward.streak === 14) msg += `\n║ 🌟 Bônus lendário!`;

        msg += `\n╠════════════════════════╣\n`;
        msg += `║ Volte amanhã para manter o streak\n`;
        msg += `╚════════════════════════╝`;

        return safeEdit(ctx, msg, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    } catch (error) {
        console.error('Erro daily chest:', error);
        try {
            return ctx.answerCbQuery('Erro ao abrir baú.', { show_alert: true });
        } catch {
            return ctx.reply('Erro ao abrir baú.');
        }
    }
}

async function handleClaimMissionRewards(ctx) {
    try {
        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return ctx.answerCbQuery(
                '🧭 Você ainda não criou personagem. Use /start.',
                { show_alert: true }
            );
        }

        ensureDailyMissionState(player);

        const result = claimAllMissionRewards(player);
        if (!result.success) {
            return ctx.answerCbQuery(result.message, { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);

        let msg = `╔══════════════════════════════╗\n`;
        msg += `║    🎉 *MISSÕES CONCLUÍDAS*      ║\n`;
        msg += `╠══════════════════════════════╣\n`;
        msg += `║ 💰 +${result.rewards.gold} ouro\n`;
        msg += `║ ✨ +${result.rewards.xp} XP\n`;

        if (result.rewards.glorias > 0) {
            msg += `║ 🏅 +${result.rewards.glorias} glória\n`;
        }

        if (result.rewards.keys > 0) {
            msg += `║ 🗝️ +${result.rewards.keys} chave\n`;
        }

        msg += `╚══════════════════════════════╝`;

        return safeEdit(ctx, msg, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    } catch (error) {
        console.error('Erro mission rewards:', error);
        try {
            return ctx.answerCbQuery('Erro ao resgatar recompensas.', { show_alert: true });
        } catch {
            return ctx.reply('Erro ao resgatar recompensas.');
        }
    }
}

module.exports = {
    handleDaily,
    handleDailyChest,
    handleClaimMissionRewards,
    giveDailyChest
};