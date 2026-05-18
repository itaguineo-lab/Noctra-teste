const { Markup } = require('telegraf');

function mainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Caçar', 'hunt')
        ],
        [
            Markup.button.callback('🎒 Inventário', 'inventory'),
            Markup.button.callback('👤 Perfil', 'profile')
        ],
        [
            Markup.button.callback('⚡ Energia', 'energy'),
            Markup.button.callback('🎁 Diário', 'daily')
        ],
        [
            Markup.button.callback('🏰 Masmorra', 'dungeon'),
            Markup.button.callback('🗺️ Viajar', 'travel')
        ],
        [
            Markup.button.callback('🏹 Expedição', 'expedition'),
            Markup.button.callback('🏟️ Arena', 'arena')
        ],
        [
            Markup.button.callback('🛒 Loja', 'shop'),
            Markup.button.callback('🏆 Ranking', 'ranking')
        ],
        [
            Markup.button.callback('💎 VIP', 'vip')
        ]
    ]);
}

module.exports = { mainMenu };
