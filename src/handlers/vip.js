const { Markup } = require('telegraf');
const { getPlayer } = require('../core/player/playerService');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');
const { BALANCE } = require('../data/balance');

const VIP_KEYBOARD = Markup.inlineKeyboard([
    [Markup.button.callback('🏰 Loja do Castelo', 'shop_castle')],
    [Markup.button.callback('🏠 Menu', 'menu')]
]);

function formatPercentBonus(multiplier = 1) {
    return Math.round((multiplier - 1) * 100);
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

        const inventoryBonus = Math.max(0, BALANCE.inventory.vipMax - BALANCE.inventory.baseMax);
        const xpBonus = formatPercentBonus(BALANCE.vip.xpMultiplier);
        const goldBonus = formatPercentBonus(BALANCE.vip.goldMultiplier);

        let msg = `💎 *VIP*\n\n`;

        if (vipActive) {
            const expiry = new Date(player.vipExpires).toLocaleDateString('pt-BR');
            msg += `✨ VIP ativo até ${expiry}\n\n`;
        } else {
            msg += `❌ Você não é VIP.\n\n`;
        }

        msg += `*Benefícios ativos no sistema:*\n`;
        msg += `⚡ Energia máxima: ${BALANCE.energy.vipMax}\n`;
        msg += `⏱️ Regeneração: 1 a cada ${BALANCE.energy.vipRegenMinutes} minutos\n`;
        msg += `✨ +${xpBonus}% XP\n`;
        msg += `💰 +${goldBonus}% ouro\n`;
        msg += `🎒 +${inventoryBonus} slots de inventário\n\n`;

        if (!vipActive) {
            msg += `🛒 Adquira na loja do Castelo.`;
        }

        return navigateText(ctx, msg, {
            parse_mode: 'Markdown',
            ...VIP_KEYBOARD
        });
    } catch (error) {
        console.error('Erro VIP:', error);
        return safeAnswer(ctx, 'Erro ao mostrar VIP.', { show_alert: true });
    }
}

module.exports = { handleVip };