const { calculateDamage } = require('./damageCalc');

function trimLogs(logs, max = 8) {
    return logs.slice(-max);
}

function createFight(player, enemy) {
    return {
        player: {
            id: player.id,
            name: player.name,
            hp: player.hp,
            maxHp: player.maxHp,
            atk: player.atk,
            def: player.def,
            crit: player.crit || 5,
            souls: player.souls || [],
            shield: 0,
            shieldDuration: 0
        },

        enemy: {
            id: enemy.id || enemy.name,
            name: enemy.name,
            hp: enemy.hp,
            maxHp: enemy.hp,
            atk: enemy.atk,
            def: enemy.def,
            crit: enemy.crit || 5,
            level: enemy.level || 1,
            xp: enemy.xp || 0,
            gold: enemy.gold || 0,
            frozen: false
        },

        turn: 1,
        status: 'active',
        rewards: null,
        logs: [`⚔️ Um ${enemy.name} surgiu das sombras!`]
    };
}

function processPlayerTurn(fight) {
    if (fight.status !== 'active') return null;

    const result = calculateDamage(
        fight.player,
        fight.enemy
    );

    fight.enemy.hp = Math.max(
        0,
        fight.enemy.hp - result.damage
    );

    fight.logs.push(
        result.isCrit
            ? `💥 CRÍTICO! Causaste *${result.damage}* dano!`
            : `🗡️ Causaste *${result.damage}* dano!`
    );

    if (fight.enemy.hp <= 0) {
        fight.status = 'win';

        fight.rewards = {
            xp: fight.enemy.xp,
            gold: fight.enemy.gold
        };

        fight.logs.push(
            `💀 ${fight.enemy.name} foi derrotado!`
        );
    }

    fight.logs = trimLogs(fight.logs);

    return result;
}

function processEnemyTurn(fight) {
    if (fight.status !== 'active') return null;

    const result = calculateDamage(
        fight.enemy,
        fight.player
    );

    fight.player.hp = Math.max(
        0,
        fight.player.hp - result.damage
    );

    fight.logs.push(
        `👹 ${fight.enemy.name} causou *${result.damage}* dano!`
    );

    if (fight.player.hp <= 0) {
        fight.status = 'loss';

        fight.logs.push(
            `☠️ Foste derrotado por ${fight.enemy.name}...`
        );
    }

    fight.turn++;
    fight.logs = trimLogs(fight.logs);

    return result;
}

function attemptFlee(fight) {
    if (fight.status !== 'active') return false;

    const success = Math.random() <= 0.6;

    if (success) {
        fight.status = 'fled';
        fight.logs.push(`🏃 Fugiste com sucesso.`);
    } else {
        fight.logs.push(`🚫 Não conseguiste fugir!`);
    }

    fight.logs = trimLogs(fight.logs);

    return success;
}

module.exports = {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee
};