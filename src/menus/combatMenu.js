const { Markup } = require('telegraf');

function combatMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '🗡️ Atacar',
        'attack'
      )
    ],
    [
      Markup.button.callback(
        '💀 Almas',
        'soul'
      ),
      Markup.button.callback(
        '🧪 Consumíveis',
        'consumables'
      )
    ],
    [
      Markup.button.callback(
        '🏃 Fugir',
        'flee'
      )
    ]
  ]);
}

function postCombatMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '⚔️ Caçar Novamente',
        'hunt'
      )
    ],
    [
      Markup.button.callback(
        '🎒 Inventário',
        'inventory'
      ),
      Markup.button.callback(
        '🗺️ Menu',
        'menu'
      )
    ]
  ]);
}

module.exports = {
  combatMenu,
  postCombatMenu
};