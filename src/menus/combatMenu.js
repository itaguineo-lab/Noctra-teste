const { Markup } = require('telegraf');

function combatMenu(fight = null) {
    const playerLowHp =
        fight &&
        fight.player &&
        fight.player.hp <= fight.player.maxHp * 0.3;

    const enemyLowHp =
        fight &&
        fight.enemy &&
        fight.enemy.hp <= fight.enemy.maxHp * 0.25;

    const attackLabel = enemyLowHp
        ? '⚔️ Finalizar'
        : '⚔️ Atacar';

    const itemLabel = playerLowHp
        ? '🧪 Curar'
        : '🧪 Consumíveis';

    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                attackLabel,
                'combat_attack'
            )
        ],
        [
            Markup.button.callback(
                itemLabel,
                'combat_items'
            ),
            Markup.button.callback(
                '💀 Almas',
                'combat_souls'
            )
        ],
        [
            Markup.button.callback(
                '🏃 Fugir',
                'combat_flee'
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