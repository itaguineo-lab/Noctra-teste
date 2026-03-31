const { Markup } = require('telegraf');

function inventoryCategoryMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '⚔️ Armas',
        'inv_weapons'
      ),
      Markup.button.callback(
        '🛡️ Armaduras',
        'inv_armors'
      )
    ],
    [
      Markup.button.callback(
        '💎 Jóias',
        'inv_jewelry'
      ),
      Markup.button.callback(
        '🧪 Consumíveis',
        'inv_consumables'
      )
    ],
    [
      Markup.button.callback(
        '🎨 Skins',
        'inv_skins'
      ),
      Markup.button.callback(
        '💀 Almas',
        'inv_souls'
      )
    ],
    [
      Markup.button.callback(
        '🏠 Menu',
        'menu'
      )
    ]
  ]);
}

module.exports = {
  inventoryCategoryMenu
};