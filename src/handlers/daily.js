const { getPlayer, savePlayer } = require('../core/player/playerService');
const { mainMenu } = require('../menus/mainMenu');

function giveDailyChest(player) {
    const today = new Date().toDateString();
    if (player.lastDailyChest === today) return null;
    player.lastDailyChest = today;

    const baseGold = 100 + player.level * 20;
    const keys = 1;
    const noxChance = Math.random() < 0.03; // 3% de chance de ganhar Nox (opcional)
    const noxAmount = noxChance ? 5 : 0;

    player.gold = (player.gold || 0) + baseGold;
    player.keys = (player.keys || 0) + keys;
    if (noxAmount > 0) player.nox = (player.nox || 0) + noxAmount;

    return { gold: baseGold, keys, nox: noxAmount };
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
        if (!reward) return ctx.answerCbQuery('🎁 Você já pegou seu baú hoje! Volte amanhã.', true);

        savePlayer(ctx.from.id, player);

        let msg = `╔══════════════════════════════════╗
║            🎁 *BAÚ DIÁRIO*            ║
╠══════════════════════════════════╣
║  📦 Você abriu o baú e encontrou:
║
║  💰 +${reward.gold} ouro
║  🗝️ +${reward.keys} chave`;
        if (reward.nox > 0) msg += `\n║  💎 +${reward.nox} Nox (sorte!)`;
        msg += `\n╠══════════════════════════════════╣
║  Volte amanhã para mais!
╚══════════════════════════════════╝`;

        await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
    } catch (error) {
        console.error('Erro daily:', error);
        await ctx.answerCbQuery('Erro ao abrir baú.');
    }
}

module.exports = { handleDaily };