const { Markup } = require('telegraf');

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━';

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

function getItemIcon(item = {}) {
    if (item.emoji) return item.emoji;
    if (item.effect === 'potionHp') return '❤️';
    if (item.effect === 'potionEnergy' || item.effect === 'energyRefill') return '⚡';
    if (item.effect === 'tonicStrength') return '💪';
    if (item.effect === 'tonicDefense') return '🛡️';
    if (item.type === 'vip') return '👑';
    if (item.type === 'cosmetic') return '✨';
    if (item.shop === 'arena') return '🏅';
    return '📦';
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
    const prefix = buildAffordabilityPrefix(player, item);
    return `${prefix} ${getItemIcon(item)} ${item.name} • ${symbol}${formatNumber(item.price)}`;
}

function shopMainMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🛍️ Comprar itens', 'shop_buy_menu')],
        [Markup.button.callback('💰 Vender loot', 'shop_sell')],
        [Markup.button.callback('🏠 Menu principal', 'menu')]
    ]);
}

function shopTabsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🧪 Suprimentos', 'shop_village')],
        [Markup.button.callback('👑 Premium', 'shop_castle')],
        [Markup.button.callback('⚔️ Arena', 'shop_arena')],
        [Markup.button.callback('◀️ Voltar', 'shop')]
    ]);
}

function renderShop(title, items, player = {}) {
    let text = `${title}\n`;
    const keyboard = [];

    if (!items.length) {
        text += `\n_Nenhum item disponível no momento._`;
    }

    items.forEach((item, index) => {
        const symbol = currencySymbol(item.currency);
        const typeLabel = getShopItemTypeLabel(item);
        const affordable = canAfford(player, item);
        const balance = getPlayerBalance(player, item.currency);
        const missing = Math.max(0, Number(item.price || 0) - balance);
        const status = affordable
            ? '✅ Disponível para compra'
            : `🔒 Faltam ${formatNumber(missing)} ${currencyName(item.currency)}`;

        text += `\n${DIVIDER}\n`;
        text += `${String(index + 1).padStart(2, '0')} • ${getItemIcon(item)} *${escapeMarkdown(item.name)}*\n`;
        text += `${escapeMarkdown(typeLabel)} • ${symbol} ${formatNumber(item.price)} ${escapeMarkdown(currencyName(item.currency))}\n`;
        text += `${status}\n`;
        text += `${escapeMarkdown(item.description || 'Sem descrição')}\n`;

        keyboard.push([
            Markup.button.callback(
                buildItemButtonLabel(item, player),
                `buy_${item.id}`
            )
        ]);
    });

    keyboard.push([
        Markup.button.callback('◀️ Voltar às categorias', 'shop_buy_menu')
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
    buildItemButtonLabel,
    getItemIcon
};
