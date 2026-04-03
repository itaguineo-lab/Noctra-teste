const { Markup } = require('telegraf');

function inventoryMainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Armas', 'inv_weapon'),
            Markup.button.callback('🛡️ Armaduras', 'inv_armor')
        ],
        [
            Markup.button.callback('💍 Jóias', 'inv_jewelry'),
            Markup.button.callback('🎨 Skins', 'inv_skin')
        ],
        [
            Markup.button.callback('🧪 Consumíveis', 'inv_consumable'),
            Markup.button.callback('💀 Almas', 'inv_soul')
        ],
        [
            Markup.button.callback('✨ Equipar melhor', 'auto_equip')
        ],
        [
            Markup.button.callback('◀️ Voltar', 'menu')
        ]
    ]);
}

module.exports = {
    inventoryMainMenu
};