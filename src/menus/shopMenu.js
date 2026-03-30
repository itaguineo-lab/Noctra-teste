const { Markup } = require('telegraf');

function shopTabsMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Vila (Ouro)', 'shop_village')],
    [Markup.button.callback('🏰 Castelo (Nox)', 'shop_castle')],
    [Markup.button.callback('⚔️ Matadores (Glórias)', 'shop_arena')],
    [Markup.button.callback('◀️ Voltar', 'menu')]
  ]);
}

function renderShop(title, items, player) {
  let text = `🛒 *${title}*
`;
  text += `💰 Ouro: ${player.gold || 0} | 💎 Nox: ${player.nox || 0} | 🏅 Glórias: ${player.glorias || 0}

`;

  const keyboard = [];

  items.forEach(item => {
    const symbol = item.currency === 'gold' ? '💰' : item.currency === 'nox' ? '💎' : '🏅';
    text += `*${item.name}*
└ ${symbol} ${item.price} — _${item.description || 'Sem descrição.'}_

`;
    keyboard.push([Markup.button.callback(`Comprar ${item.name}`, `buy_${item.id}`)]);
  });

  keyboard.push([Markup.button.callback('◀️ Voltar', 'shop')]);

  return { text, keyboard: Markup.inlineKeyboard(keyboard) };
}

module.exports = { shopTabsMenu, renderShop };