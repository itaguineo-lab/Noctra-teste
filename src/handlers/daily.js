const { getPlayerSafe, getMainMenuText } = require('../utils/helpers');
const { savePlayer } = require('../core/player/playerService');
const { mainMenu } = require('../menus/mainMenu');

function giveDailyChest(player) {
    const today = new Date().toDateString();
    if (player.lastDailyChest === today) return null;
    player.lastDailyChest = today;
    const reward = {
        gold: 100 + player.level * 20,
        keys: 1,
        // Nox removido
    };
    player.gold = (player.gold || 0) + reward.gold;
    player.keys = (player.keys || 0) + reward.keys;
    return reward;
}

async function handleDaily(ctx) {
    try {
        const player = getPlayerSafe(ctx.from.id);
        const reward = giveDailyChest(player);
        if (!reward) return ctx.answerCbQuery('🎁 Você já pegou hoje!', true);
        savePlayer(ctx.from.id, player);
        let msg = `🎁 *Baú Diário*\n\n💰 +${reward.gold} ouro\n🗝️ +${reward.keys} chave\n\n${getMainMenuText(player, ctx.from.first_name)}`;
        await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...mainMenu() });
    } catch (error) {
        console.error('Erro daily:', error);
        await ctx.answerCbQuery('Erro ao abrir baú.');
    }
}
module.exports = { handleDaily };