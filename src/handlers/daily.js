const { getPlayer, savePlayer } = require('../core/player/playerService');
const { mainMenu } = require('../menus/mainMenu');

function giveDailyChest(player) {
    const today = new Date().toDateString();
    if (player.lastDailyChest === today) return null;
    player.lastDailyChest = today;
    const reward = { gold: 100 + player.level * 20, keys: 1 };
    player.gold = (player.gold || 0) + reward.gold;
    player.keys = (player.keys || 0) + reward.keys;
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
        let anim = '🎁🎁🎁 ✨✨✨';
        await ctx.answerCbQuery(anim, true);
        await new Promise(resolve => setTimeout(resolve, 500));
        let msg = `╔══════════════════════════════════╗
║            🎁 *BAÚ DIÁRIO*            ║
╠══════════════════════════════════╣
║  📦 Você abriu o baú e encontrou:
║
║  💰 +${reward.gold} ouro
║  🗝️ +${reward.keys} chave
╠══════════════════════════════════╣
║  Volte amanhã para mais!
╚══════════════════════════════════╝`;
        await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
    } catch (error) {
        console.error('Erro daily:', error);
        await ctx.answerCbQuery('Erro ao abrir baú.');
    }
}

module.exports = { handleDaily };