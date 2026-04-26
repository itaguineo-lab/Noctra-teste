const { Markup } = require('telegraf');
const { getPlayer, isVipActive } = require('../core/player/playerService');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');
const { BALANCE } = require('../data/balance');

const VIP_KEYBOARD = Markup.inlineKeyboard([
    [Markup.button.callback('🏰 Loja do Castelo', 'shop_castle')],
    [Markup.button.callback('🏠 Menu', 'menu')]
]);

function formatPercentBonus(multiplier = 1) {
    return Math.round((multiplier - 1) * 100);
}

/*
FIX: vip.js usava verificação manual de VIP:
    player.vip && player.vipExpires && new Date() < new Date(player.vipExpires)

Isso divergia do isVipActive() centralizado em playerService.js, que trata
edge cases como: timestamp numérico, VIP sem vipExpires (permanente),
Date object vs string ISO vs number. A checagem manual falhava silenciosamente
para VIPs sem vipExpires definido (VIP permanente concedido por admin).

Corrigido: sempre usar isVipActive(player) de playerService.
*/
async function handleVip(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return safeAnswer(ctx, '❌ Perfil não encontrado.', { show_alert: true });
        }

        const vipAtivo = isVipActive(player);

        const inventoryBonus = Math.max(0, BALANCE.inventory.vipMax - BALANCE.inventory.baseMax);
        const xpBonus = formatPercentBonus(BALANCE.vip.xpMultiplier);
        const goldBonus = formatPercentBonus(BALANCE.vip.goldMultiplier);
        const energyBonus = BALANCE.energy.vipMax - BALANCE.energy.baseMax;

        let msg = `💎 *VIP — CAÇADOR DA NOITE*\n\n`;

        if (vipAtivo) {
            if (player.vipExpires) {
                const expiry = new Date(player.vipExpires).toLocaleDateString('pt-BR');
                msg += `✨ *Status:* VIP ativo até ${expiry}\n\n`;
            } else {
                msg += `✨ *Status:* VIP permanente ativo\n\n`;
            }
        } else {
            msg += `❌ *Status:* Você não é VIP.\n\n`;
        }

        msg += `*Benefícios VIP:*\n`;
        msg += `⚡ Energia máxima: ${BALANCE.energy.vipMax} (+${energyBonus})\n`;
        msg += `⏱️ Regeneração: 1 a cada ${BALANCE.energy.vipRegenMinutes}min\n`;
        msg += `✨ +${xpBonus}% XP em combate\n`;
        msg += `💰 +${goldBonus}% ouro em combate\n`;
        msg += `🎒 +${inventoryBonus} slots de inventário\n`;
        msg += `☠️ -5% penalidade de XP por morte\n\n`;

        if (!vipAtivo) {
            msg += `🛒 *Adquira na Loja do Castelo.*`;
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
