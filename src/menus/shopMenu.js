const { Markup } = require('telegraf');

function currencySymbol(currency) {
    if (currency === 'gold') return '💰';
    if (currency === 'nox') return '💎';
    if (currency === 'glorias') return '🏅';
    return '💰';
}

function currencyName(currency) {
    if (currency === 'gold') return 'ouro';
    if (currency === 'nox') return 'Nox';
    if (currency === 'glorias') return 'glórias';
    return currency || 'moeda';
}

function getShopItemTypeLabel(item = {}) {
    if (item.type === 'consumable') return 'Consumível';
    if (item.type === 'equipment') {
        if (item.slot === 'weapon') return 'Arma';
        if (item.slot === 'ring' || item.slot === 'necklace') return 'Joia';
        return 'Armadura';
    }
    if (item.type === 'vip') return 'VIP';
    if (item.type === 'cosmetic') return 'Cosmético';
    return 'Item';
}

function buildItemButtonLabel(item = {}) {
    const symbol = currencySymbol(item.currency);
    const typeLabel = getShopItemTypeLabel(item);
    return `🛒 ${item.name} • ${typeLabel} • ${symbol}${item.price}`;
}

function shopMainMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Comprar', 'shop_buy_menu')],
        [Markup.button.callback('💰 Vender', 'shop_sell')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);
}

function shopTabsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Vila', 'shop_village')],
        [Markup.button.callback('🏰 Castelo', 'shop_castle')],
        [Markup.button.callback('⚔️ Arena', 'shop_arena')],
        [Markup.button.callback('◀️ Voltar', 'shop')]
    ]);
}

function renderShop(title, items, player) {
    let text = `${title}\n\n`;
    text += `💰 Ouro: ${player.gold || 0}\n`;
    text += `💎 Nox: ${player.nox || 0}\n`;
    text += `🏅 Glórias: ${player.glorias || 0}\n\n`;

    const keyboard = [];

    if (!items.length) {
        text += `_Nenhum item disponível no momento._`;
    }

    items.forEach((item, index) => {
        const symbol = currencySymbol(item.currency);
        const typeLabel = getShopItemTypeLabel(item);

        text += `*${index + 1}. ${item.name}*\n`;
        text += `Tipo: ${typeLabel}\n`;
        text += `Preço: ${symbol} ${item.price} ${currencyName(item.currency)}\n`;
        text += `${item.description || 'Sem descrição'}\n\n`;

        keyboard.push([
            Markup.button.callback(
                buildItemButtonLabel(item),
                `buy_${item.id}`
            )
        ]);
    });

    keyboard.push([
        Markup.button.callback('◀️ Voltar', 'shop_buy_menu')
    ]);

    return {
        text: text.trim(),
        keyboard: Markup.inlineKeyboard(keyboard)
    };
}

module.exports = {
    shopMainMenu,
    shopTabsMenu,
    renderShop
};