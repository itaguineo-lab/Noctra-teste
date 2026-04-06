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
        const player = await getPlayer(ctx.from.id);
        const vipActive = player.vip && player.vipExpires && new Date() < new Date(player.vipExpires);

        let msg = `💎 *VIP*\n\n`;
        if (vipActive) {
            const expiry = new Date(player.vipExpires).toLocaleDateString('pt-BR');
            msg += `✨ VIP ativo até ${expiry}\n\n`;
        } else {
            msg += `❌ Você não é VIP.\n\n`;
        }

        msg += `*Benefícios:*\n`;
        msg += `⚡ Energia máxima: 40\n`;
        msg += `⏱️ Regeneração: 1 a cada 8 minutos\n`;
        msg += `💰 +50% recompensas (XP e ouro)\n`;
        msg += `🎒 +10 slots de inventário\n`;
        msg += `🎁 Baú extra diário\n\n`;

        if (!vipActive) msg += `🛒 Adquira na loja do Castelo.`;

        await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
    } catch (error) {
        console.error('Erro VIP:', error);
        await ctx.answerCbQuery('Erro ao mostrar VIP.');
    }
}

module.exports = { handleVip };