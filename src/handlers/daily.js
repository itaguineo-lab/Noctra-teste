const { getPlayer, savePlayer } = require('../core/player/playerService');
const { mainMenu } = require('../menus/mainMenu');

function giveDailyChest(player) {
    const today = new Date().toDateString();
    if (player.lastDailyChest === today) return null;
    player.lastDailyChest = today;

    const reward = {
        gold: 100 + player.level * 20,
        keys: 1,
        nox: Math.random() < 0.05 ? 1 : 0  // 5% de chance
    };

    player.gold = (player.gold || 0) + reward.gold;
    player.keys = (player.keys || 0) + reward.keys;
    if (reward.nox) player.nox = (player.nox || 0) + reward.nox;

    return reward;
}

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function handleDaily(ctx) {
    try {
        const player = getPlayer(ctx.from.id, ctx.from.first_name);
        const reward = giveDailyChest(player);
        if (!reward) return ctx.answerCbQuery('🎁 Você já pegou hoje!', true);

        savePlayer(ctx.from.id, player);

        let msg = `🎁 *Baú Diário*\n\n💰 +${reward.gold} ouro\n🗝️ +${reward.keys} chave`;
        if (reward.nox) msg += `\n💎 +${reward.nox} Nox`;

        await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
    } catch (error) {
        console.error('Erro daily:', error);
        await ctx.answerCbQuery('Erro ao abrir baú.');
    }
}

module.exports = { handleDaily };