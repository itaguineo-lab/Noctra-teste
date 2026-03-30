const { getPlayer } = require('../core/player/playerService');
const { mainMenu } = require('../menus/mainMenu');

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

async function handleVip(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const vipActive = player.vip && player.vipExpires && new Date() < new Date(player.vipExpires);

    let msg = `💎 *VIP*

`;

    if (vipActive) {
      const expiry = new Date(player.vipExpires).toLocaleDateString('pt-BR');
      msg += `✨ VIP ativo até ${expiry}

`;
    } else {
      msg += `❌ Você não é VIP.

`;
    }

    msg += `*Benefícios:*
`;
    msg += `⚡ Energia máxima: 40
`;
    msg += `⏱️ Regen: 1 a cada 3 min
`;
    msg += `💰 +50% recompensas
`;
    msg += `🎒 +10 slots
`;
    msg += `🎁 Baú extra diário

`;

    if (!vipActive) msg += `🛒 Adquira na loja do Castelo.`;

    await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
  } catch (error) {
    console.error('Erro VIP:', error);
    await ctx.answerCbQuery('Erro ao mostrar VIP.');
  }
}

module.exports = { handleVip };