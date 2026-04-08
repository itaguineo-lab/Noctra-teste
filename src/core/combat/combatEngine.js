const {
    calculateDamage
} = require('./damageCalc');

const {
    activateSoul
} = require('../player/souls');

/*
=================================
HELPERS
=================================
*/

function trimLogs(logs, max = 8) {
    return logs.slice(-max);
}

function setVictory(fight) {
    if (fight.status === 'win') return;

    fight.status = 'win';

    fight.rewards = {
        xp: fight.enemy.xp || 0,
        gold: fight.enemy.gold || 0
    };

    fight.logs.push(
        `💀 ${fight.enemy.name} tombou nas sombras!`
    );
}

function getPlayerAttackText(enemyName, damage, isCrit) {
    let text =
        `⚔️ Você golpeia ${enemyName} e causa *${damage}* de dano!`;

    if (isCrit) {
        text += `\n💥 *CRÍTICO!*`;
    }

    return text;
}

function getEnemyAttackText(enemyName, damage, isCrit) {
    let text =
        `👹 ${enemyName} ataca e causa *${damage}* de dano!`;

    if (isCrit) {
        text += `\n💀 *Golpe crítico!*`;
    }

    return text;
}

/*
=================================
CREATE
=================================
*/

function createFight(player, enemy) {
    return {
        player: {
            id: player.id,
            name: player.name,
            className: player.class,
            hp: player.hp,
            maxHp: player.maxHp,
            atk: player.atk,
            def: player.def,
            crit: player.crit || 5,
            souls: Array.isArray(player.soulsEquipped)
                ? player.soulsEquipped
                : [null, null],
            shield: 0,
            energy: player.energy,
            maxEnergy: player.maxEnergy,
            buffs: [],
            defending: false
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
            isBoss: !!enemy.isBoss,
            frozen: false,
            bleedTurns: 0,
            poisonTurns: 0,
            buffs: []
        },

        turn: 1,
        status: 'ongoing',
        rewards: null,
        logs: [
            `🌑 Um *${enemy.name}* surgiu das sombras!`
        ],
        lastDamageDealt: 0,
        lastDamageReceived: 0
    };
}

/*
=================================
PLAYER TURN
=================================
*/

function processPlayerTurn(fight) {
    if (fight.status !== 'ongoing') {
        return null;
    }

    const result = calculateDamage(
        fight.player,
        fight.enemy
    );

    fight.enemy.hp = Math.max(
        0,
        fight.enemy.hp - result.damage
    );

    fight.lastDamageDealt = result.damage;

    fight.logs.push(
        getPlayerAttackText(
            fight.enemy.name,
            result.damage,
            result.isCrit
        )
    );

    if (fight.enemy.hp <= 0) {
        setVictory(fight);
    }

    fight.logs = trimLogs(fight.logs);

    return result;
}

/*
=================================
ENEMY TURN
=================================
*/

function processEnemyTurn(fight) {
    if (fight.status !== 'ongoing') {
        return null;
    }

    if (fight.enemy.frozen) {
        fight.logs.push(
            `❄️ ${fight.enemy.name} perdeu o turno!`
        );

        fight.enemy.frozen = false;
        fight.turn++;

        return null;
    }

    let multiplier = 1;

    if (fight.player.defending) {
        multiplier = 0.5;
    }

    const result = calculateDamage(
        fight.enemy,
        fight.player,
        { multiplier }
    );

    fight.player.hp = Math.max(
        0,
        fight.player.hp - result.damage
    );

    fight.lastDamageReceived = result.damage;

    fight.logs.push(
        getEnemyAttackText(
            fight.enemy.name,
            result.damage,
            result.isCrit
        )
    );

    if (fight.player.hp <= 0) {
        fight.status = 'loss';

        fight.logs.push(
            `☠️ Você foi derrotado...`
        );
    }

    fight.turn++;
    fight.logs = trimLogs(fight.logs);

    return result;
}

/*
=================================
SOUL
=================================
*/

function useSoul(fight, soulIndex) {
    const soul = fight.player.souls[soulIndex];

    if (!soul) {
        fight.logs.push('❌ Alma vazia');
        return null;
    }

    const result = activateSoul(soul, fight);

    if (result?.message) {
        fight.logs.push(result.message);
    }

    if (fight.enemy.hp <= 0) {
        setVictory(fight);
    }

    fight.logs = trimLogs(fight.logs);

    return result;
}

function applyDefend(fight) {
    fight.player.defending = true;
    fight.logs.push(
        '🛡️ Você assume postura defensiva.'
    );
}

function attemptFlee(fight) {
    const success = Math.random() <= 0.6;

    if (success) {
        fight.status = 'fled';
        fight.logs.push('🏃 Você fugiu.');
    } else {
        fight.logs.push('🚫 Falha na fuga!');
        processEnemyTurn(fight);
    }

    fight.logs = trimLogs(fight.logs);

    return success;
}

module.exports = {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee,
    useSoul,
    applyDefend
};