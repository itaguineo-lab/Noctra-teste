const { Markup } = require('telegraf');

function inventoryCategoryMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚔️ Armas', 'inv_weapons'), Markup.button.callback('🛡️ Armaduras', 'inv_armors')],
    [Markup.button.callback('📿 Acessórios', 'inv_jewelry'), Markup.button.callback('🧪 Consumíveis', 'inv_consumables')],
    [Markup.button.callback('💀 Almas', 'inv_souls')],
    [Markup.button.callback('◀️ Voltar ao Menu', 'menu')]
  ]);
}

module.exports = { inventoryCategoryMenu };