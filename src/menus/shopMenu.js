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

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function getShopItemTypeLabel(item = {}) {
    if (item.type === 'consumable') return 'Consumível';
    if (item.type === 'equipment') {
        if (item.slot === 'weapon') return 'Arma';
        if (item.slot === 'ring' || item.slot === 'necklace') return 'Joia';
        if (item.slot === 'shield') return 'Mão Secundária';
        return 'Armadura';
    }
    if (item.type === 'vip') return 'VIP';
    if (item.type === 'cosmetic') return 'Cosmético';
    return 'Item';
}

function getPlayerBalance(player = {}, currency = 'gold') {
    return Number(player?.[currency] || 0);
}

function canAfford(player, item) {
    return getPlayerBalance(player, item?.currency) >= Number(item?.price || 0);
}

function buildAffordabilityPrefix(player, item) {
    return canAfford(player, item) ? '✅' : '🔒';
}

function buildItemButtonLabel(item = {}, player = {}) {
    const symbol = currencySymbol(item.currency);
    const typeLabel = getShopItemTypeLabel(item);
    const prefix = buildAffordabilityPrefix(player, item);
    return `${prefix} ${item.name} • ${typeLabel} • ${symbol}${formatNumber(item.price)}`;
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

function renderShop(title, items, player = {}) {
    let text = `${title}\n\n`;
    const keyboard = [];

    if (!items.length) {
        text += `_Nenhum item disponível no momento._`;
    }

    items.forEach((item, index) => {
        const symbol = currencySymbol(item.currency);
        const typeLabel = getShopItemTypeLabel(item);
        const affordable = canAfford(player, item);
        const balance = getPlayerBalance(player, item.currency);
        const missing = Math.max(0, Number(item.price || 0) - balance);

        text += `*${index + 1}. ${escapeMarkdown(item.name)}*\n`;
        text += `Tipo: ${escapeMarkdown(typeLabel)}\n`;
        text += `Preço: ${symbol} ${formatNumber(item.price)} ${escapeMarkdown(currencyName(item.currency))}\n`;
        text += `Status: ${affordable ? '✅ Você pode comprar' : `🔒 Faltam ${formatNumber(missing)} ${currencyName(item.currency)}`}\n`;
        text += `${escapeMarkdown(item.description || 'Sem descrição')}\n\n`;

        keyboard.push([
            Markup.button.callback(
                buildItemButtonLabel(item, player),
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
    renderShop,
    currencySymbol,
    currencyName,
    getShopItemTypeLabel,
    buildItemButtonLabel
};
