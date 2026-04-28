const { Markup } = require('telegraf');

function onboardingMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🌑 Criar personagem', 'create_character')]
    ]);
}

function mainMenu(hasPlayer = true) {
    if (!hasPlayer) return onboardingMenu();

    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Caçar', 'hunt'),
            Markup.button.callback('🗺️ Viajar', 'travel')
        ],
        [
            Markup.button.callback('🏰 Masmorra', 'dungeon'),
            Markup.button.callback('🏟️ Arena', 'arena')
        ],
        [
            Markup.button.callback('👤 Perfil', 'profile'),
            Markup.button.callback('🎒 Inventário', 'inventory')
        ],
        [
            Markup.button.callback('⚡ Energia', 'energy'),
            Markup.button.callback('🎁 Diário', 'daily')
        ],
        [
            Markup.button.callback('🛒 Loja', 'shop'),
            Markup.button.callback('🏆 Ranking', 'ranking')
        ],
        [
            Markup.button.callback('💎 VIP', 'vip'),
            Markup.button.callback('👥 Online', 'online')
        ]
    ]);
}

module.exports = {
    mainMenu,
    onboardingMenu
};
