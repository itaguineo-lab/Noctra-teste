const { Markup } = require('telegraf');
const { getPlayer } = require('../core/player/playerService');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');

function vipKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🏰 Loja do Castelo', 'shop_castle')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

async function handleVip(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return navigateText(ctx, '❌ Perfil não encontrado.');
        }

        const vipActive =
            player.vip &&
            player.vipExpires &&
            new Date() < new Date(player.vipExpires);

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

        if (!vipActive) {
            msg += `🛒 Adquira na loja do Castelo.`;
        }

        return navigateText(ctx, msg, {
            parse_mode: 'Markdown',
            ...vipKeyboard()
        });
    } catch (error) {
        console.error('Erro VIP:', error);
        return safeAnswer(ctx, 'Erro ao mostrar VIP.', { show_alert: true });
    }
}

module.exports = { handleVip };