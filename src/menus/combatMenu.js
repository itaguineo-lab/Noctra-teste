const { Markup } = require('telegraf');

function combatMenu(fight = null) {
    const playerLowHp = fight && fight.player && fight.player.hp <= fight.player.maxHp * 0.3;
    const enemyLowHp = fight && fight.enemy && fight.enemy.hp <= fight.enemy.maxHp * 0.25;
    
    const attackLabel = enemyLowHp ? '⚔️ Finalizar' : '⚔️ Atacar';
    const skillLabel = fight && fight.player ? `✨ ${getSkillName(fight.player.className)}` : '✨ Habilidade';
    
    return Markup.inlineKeyboard([
        [Markup.button.callback(attackLabel, 'combat_attack')],
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