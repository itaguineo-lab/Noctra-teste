const { Markup } = require('telegraf');

function inventoryCategoryMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Armas', 'inv_weapons'),
            Markup.button.callback('🛡️ Armaduras', 'inv_armors')
        ],
        [
            Markup.button.callback('💎 Joias', 'inv_jewelry'),
            Markup.button.callback('👢 Botas', 'inv_boots')
        ],
        [
            Markup.button.callback('🧪 Consumíveis', 'inv_consumables'),
            Markup.button.callback('💀 Almas', 'inv_souls')
        ],
        [
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

module.exports = {
    inventoryCategoryMenu
};
