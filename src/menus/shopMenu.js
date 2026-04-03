const { Markup } = require('telegraf');

function currencySymbol(currency) {
    if (currency === 'gold') return '💰';
    if (currency === 'nox') return '💎';
    if (currency === 'glorias') return '🏅';
    return '💰';
}

function shopTabsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Vila', 'shop_village')],
        [Markup.button.callback('🏰 Castelo VIP', 'shop_castle')],
        [Markup.button.callback('⚔️ Arena', 'shop_arena')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);
}

function renderShop(title, items, player) {
    let text =
        `╔════════════════════════╗\n` +
        `║      🛒 *${title}*      ║\n` +
        `╠════════════════════════╣\n` +
        `║ 💰 ${player.gold || 0}\n` +
        `║ 💎 ${player.nox || 0}\n` +
        `║ 🏅 ${player.glorias || 0}\n` +
        `╠════════════════════════╣\n`;

    const keyboard = [];

    if (!items.length) {
        text += `║ _Nenhum item disponível._\n`;
    }

    items.forEach(item => {
        const symbol = currencySymbol(item.currency);

        text +=
            `║ *${item.name}*\n` +
            `║ ${symbol} ${item.price}\n` +
            `║ _${item.description || 'Sem descrição'}_\n\n`;

        keyboard.push([
            Markup.button.callback(
                `🛒 ${item.name}`,
                `buy_${item.id}`
            )
        ]);
    });

    text += `╚════════════════════════╝`;

    keyboard.push([
        Markup.button.callback('◀️ Voltar', 'shop')
    ]);

    return {
        text,
        keyboard: Markup.inlineKeyboard(keyboard)
    };
}

module.exports = {
    shopTabsMenu,
    renderShop
};