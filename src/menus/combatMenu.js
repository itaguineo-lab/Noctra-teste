const { Markup } = require('telegraf');

function combatMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🗡️ Atacar', 'combat_attack'),
            Markup.button.callback('🛡️ Defender', 'combat_defend')
        ],
        [
            Markup.button.callback('💀 Alma', 'combat_soul_menu'),
            Markup.button.callback('🧪 Itens', 'combat_consumables')
        ],
        [
            Markup.button.callback('🏃 Fugir', 'combat_flee')
        ]
    ]);
}

function soulChoiceMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('💀 Alma 1', 'combat_soul_0'),
            Markup.button.callback('💀 Alma 2', 'combat_soul_1')
        ],
        [
            Markup.button.callback('◀️ Voltar', 'combat_back')
        ]
    ]);
}

function postCombatMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Caçar novamente', 'hunt'),
            Markup.button.callback('🏰 Masmorra', 'dungeon')
        ],
        [
            Markup.button.callback('🎒 Inventário', 'inventory'),
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

module.exports = {
    combatMenu,
    soulChoiceMenu,
    postCombatMenu
};