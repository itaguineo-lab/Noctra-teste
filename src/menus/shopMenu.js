const { Markup } = require('telegraf');

function currencySymbol(currency) {
    if (currency === 'gold') return '💰';
    if (currency === 'nox') return '💎';
    if (currency === 'glorias') return '🏅';
    return '💰';
}

function shopTabsMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🏠 Vila (Ouro)',
                'shop_village'
            )
        ],
        [
            Markup.button.callback(
                '🏰 Castelo (Nox)',
                'shop_castle'
            )
        ],
        [
            Markup.button.callback(
                '⚔️ Matadores (Glórias)',
                'shop_arena'
            )
        ],
        [
            Markup.button.callback(
                '◀️ Voltar',
                'menu'
            )
        ]
    ]);
}

function renderShop(title, items, player) {
    let text = `🛒 *${title}*\n`;
    text += `💰 Ouro: ${player.gold || 0} | 💎 Nox: ${player.nox || 0} | 🏅 Glórias: ${player.glorias || 0}\n\n`;

    const keyboard = [];

    if (!items.length) {
        text += '_Nenhum item disponível._\n';
    }

    items.forEach(item => {
        const symbol = currencySymbol(item.currency);

        text += `*${item.name}*\n`;
        text += `└ ${symbol} ${item.price} — _${item.description || 'Sem descrição.'}_\n\n`;

        keyboard.push([
            Markup.button.callback(
                `🛒 Comprar ${item.name}`,
                `buy_${item.id}`
            )
        ]);
    });

    keyboard.push([
        Markup.button.callback(
            '◀️ Voltar',
            'shop'
        )
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