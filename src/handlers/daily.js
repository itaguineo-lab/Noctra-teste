const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    mainMenu
} = require('../menus/mainMenu');

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
REWARD ENGINE
=================================
*/

function giveDailyChest(player) {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    if (player.lastDailyChest === today) {
        return null;
    }

    // streak
    if (player.lastDailyChest === yesterday) {
        player.dailyStreak = (player.dailyStreak || 0) + 1;
    } else {
        player.dailyStreak = 1;
    }

    player.lastDailyChest = today;
    const streak = player.dailyStreak;

    // reward scaling
    let gold = 100 + player.level * 20;
    let keys = 1;
    let glorias = 0;

    // streak milestones
    if (streak >= 3) gold += 50;
    if (streak >= 5) keys += 1;
    if (streak >= 7) glorias = 1;
    if (streak >= 14) {
        keys += 1;
        gold += 100;
    }

    // apply
    player.gold = (player.gold || 0) + gold;
    player.keys = (player.keys || 0) + keys;
    player.glorias = (player.glorias || 0) + glorias;

    return { gold, keys, glorias, streak };
}

/*
=================================
HANDLER
=================================
*/

async function handleDaily(ctx) {
    try {
        const player = await getPlayer(ctx.from.id, ctx.from.first_name);
        const reward = giveDailyChest(player);

        if (!reward) {
            return ctx.answerCbQuery(
                '🎁 Você já abriu o baú hoje. Volte amanhã.',
                { show_alert: true }
            );
        }

        await savePlayer(ctx.from.id, player);

        let msg = `╔════════════════════════╗\n`;
        msg += `║      🎁 *BAÚ DIÁRIO*      ║\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ 📦 Recompensas\n`;
        msg += `║\n`;
        msg += `║ 💰 +${reward.gold} ouro\n`;
        msg += `║ 🗝️ +${reward.keys} chave(s)`;

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
        console.error('Erro daily:', error);
        try {
            return ctx.answerCbQuery('Erro ao abrir baú.', { show_alert: true });
        } catch {
            return ctx.reply('Erro ao abrir baú.');
        }
    }
}

module.exports = {
    handleDaily,
    giveDailyChest
};