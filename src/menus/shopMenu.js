const { Markup } = require('telegraf');

function shopTabsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Vila (Ouro)', 'shop_village')],
        [Markup.button.callback('🏰 Castelo (Nox)', 'shop_castle')],
        [Markup.button.callback('⚔️ Matadores (Glórias)', 'shop_arena')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);
}

/**
 * Renderiza a interface da loja para uma categoria específica
 * @param {string} title Título da categoria
 * @param {Array} items Lista de itens do data/shop.js
 * @param {Object} player Objeto do jogador para mostrar saldo
 */
function renderShop(title, items, player) {
    let text = `🛒 *${title}*\n`;
    text += `💰 Ouro: ${player.gold} | 💎 Nox: ${player.nox}\n\n`;
    
    const keyboard = [];

    items.forEach(item => {
        const symbol = item.currency === 'gold' ? '💰' : (item.currency === 'nox' ? '💎' : '🏅');
        text += `*${item.name}*\n└ ${symbol} ${item.price} — _${item.description || 'Sem descrição.'}_\n\n`;
        
        keyboard.push([Markup.button.callback(`Comprar ${item.name}`, `buy_${item.id}`)]);
    });

    keyboard.push([Markup.button.callback('◀️ Voltar', 'shop')]);

    return {
        text,
        keyboard: Markup.inlineKeyboard(keyboard)
    };
}

module.exports = { shopTabsMenu, renderShop };
