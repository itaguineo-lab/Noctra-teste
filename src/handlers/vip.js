const { getPlayerSafe } = require('../utils/helpers');
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
        const player = getPlayerSafe(ctx.from.id);

        let msg = `💎 *VIP*\n\n`;

        const vipActive =
            player.vip &&
            player.vipExpires &&
            new Date() < new Date(player.vipExpires);

        if (vipActive) {
            const expiry = new Date(
                player.vipExpires
            ).toLocaleDateString('pt-BR');

            msg += `✨ VIP ativo até ${expiry}\n\n`;
        } else {
            msg += `❌ Você não é VIP.\n\n`;
        }

        msg += `*Benefícios:*\n`;
        msg += `⚡ Energia máxima: 40\n`;
        msg += `⏱️ Regen: 1 a cada 3 min\n`;
        msg += `💰 +50% recompensas\n`;
        msg += `🎒 +10 slots\n`;
        msg += `🎁 Baú extra diário\n\n`;

        if (!vipActive) {
            msg += `🛒 Adquira na loja do Castelo.`;
        }

        await safeEdit(ctx, msg, {
            parse_mode: 'Markdown',
            ...mainMenu()
        });
    } catch (error) {
        console.error('Erro VIP:', error);
        await ctx.answerCbQuery('Erro ao mostrar VIP.');
    }
}

module.exports = { handleVip };