const { getPlayer, savePlayer } = require('../core/player/playerService');
const { getMainMenuText } = require('../utils/helpers');
const { mainMenu } = require('../menus/mainMenu');

function giveDailyChest(player) {
  const today = new Date().toDateString();
  if (player.lastDailyChest === today) return null;

  player.lastDailyChest = today;

  const reward = {
    gold: 100 + player.level * 20,
    keys: 1,
    nox: Math.random() < 0.03 ? 5 : 0
  };

  player.gold = (player.gold || 0) + reward.gold;
  player.keys = (player.keys || 0) + reward.keys;
  player.nox = (player.nox || 0) + reward.nox;

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
    const player = getPlayer(ctx.from.id);
    const reward = giveDailyChest(player);

    if (!reward) {
      return ctx.answerCbQuery('🎁 Você já pegou hoje!', true);
    }

    savePlayer(ctx.from.id, player);

    let msg = `🎁 *Baú Diário*

`;
    msg += `💰 +${reward.gold} ouro
`;
    msg += `🗝️ +${reward.keys} chave`;
    if (reward.nox) msg += `
💎 +${reward.nox} Nox`;
    msg += `

${getMainMenuText(player, ctx.from.first_name)}`;

    await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
  } catch (error) {
    console.error('Erro daily:', error);
    await ctx.answerCbQuery('Erro ao abrir baú.');
  }
}

module.exports = { handleDaily };