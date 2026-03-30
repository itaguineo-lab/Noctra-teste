const { Markup } = require('telegraf');

function combatMenu(fight = null) {
    const skillLabel = fight && fight.player ? `✨ ${getSkillName(fight.player.className)}` : '✨ Habilidade';
    
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Atacar', 'combat_attack')],
        [Markup.button.callback(skillLabel, 'combat_skill')],
        [
            Markup.button.callback('💀 Alma', 'combat_soul'),
            Markup.button.callback('🏃 Fugir', 'combat_flee')
        ]
    ]);
}

function getSkillName(className) {
    const map = {
        guerreiro: 'Golpe Fraturante',
        arqueiro: 'Flecha Sombria',
        mago: 'Toque Gélido'
    };
    return map[className] || 'Habilidade';
}

function postCombatMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Caçar Novamente', 'hunt')],
        [Markup.button.callback('🎒 Inventário', 'inventory'), Markup.button.callback('🗺️ Menu', 'menu')]
    ]);
}

module.exports = { combatMenu, postCombatMenu };