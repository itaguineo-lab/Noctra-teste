const { Markup } = require('telegraf');

function combatMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Atacar', 'combat_attack')],
        [Markup.button.callback('💀 Almas', 'combat_soul')],
        [Markup.button.callback('🧪 Poções', 'combat_consumables')],
        [Markup.button.callback('🏃 Fugir', 'combat_flee')]
    ]);
}

function postCombatMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Caçar Novamente', 'hunt')],
        [Markup.button.callback('🎒 Inventário', 'inventory'), Markup.button.callback('🗺️ Menu', 'menu')]
    ]);
}

module.exports = { combatMenu, postCombatMenu };