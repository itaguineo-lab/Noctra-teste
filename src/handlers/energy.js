const { getPlayer } = require('../core/player/playerService');
const { updateEnergy } = require('../services/energyService');
const { getMainMenuText } = require('../utils/helpers');
const { progressBar } = require('../utils/formatters');
const { mainMenu } = require('../menus/mainMenu');

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

async function handleEnergy(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    updateEnergy(player);

    const bar = progressBar(player.energy, player.maxEnergy, 8);
    let msg = `⚡ *Energia*: ${player.energy}/${player.maxEnergy}
`;
    msg += `[${bar}] ${Math.floor((player.energy / player.maxEnergy) * 100)}%

`;
    msg += `⏱️ Regeneração: ${player.vip ? '1 a cada 3 min' : '1 a cada 6 min'}
`;
    msg += `🧪 Compre poções na loja.

`;
    msg += getMainMenuText(player, ctx.from.first_name);

    await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
  } catch (error) {
    console.error('Erro energia:', error);
    await ctx.answerCbQuery('Erro ao mostrar energia.');
  }
}

module.exports = { handleEnergy };