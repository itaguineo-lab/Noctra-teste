const { calculateDamage } = require('./damageCalc');
const { activateSoul } = require('../player/souls');
const { ENEMY_ABILITIES } = require('../world/enemies');

/*
=================================
HELPERS
=================================
*/

function trimLogs(logs, max = 8) {
    return Array.isArray(logs) ? logs.slice(-max) : [];
}

function ensureFightShape(fight) {
    fight.logs ??= [];
    fight.turn ??= 1;
    fight.status ??= 'ongoing';
    fight.rewards ??= null;
    fight.lastDamageDealt ??= 0;
    fight.lastDamageReceived ??= 0;

    fight.player ??= {};
    fight.enemy ??= {};

    fight.player.shield ??= 0;
    fight.player.buffs ??= [];
    fight.player.defending ??= false;
    fight.player.stunned ??= false;
    fight.player.souls ??= [null, null];

    fight.enemy.frozen ??= false;
    fight.enemy.poisonTurns ??= 0;
    fight.enemy.bleedTurns ??= 0;
    fight.enemy.shield ??= 0;
    fight.enemy.buffs ??= [];

    return fight;
}

function setVictory(fight) {
    if (fight.status === 'win') return;

    fight.status = 'win';
    fight.rewards = {
        xp: fight.enemy.xp || 0,
        gold: fight.enemy.gold || 0
    };
    fight.logs.push(`💀 ${fight.enemy.name} tombou nas sombras!`);
}

function setLoss(fight) {
    if (fight.status === 'loss') return;

    fight.status = 'loss';
    fight.logs.push('☠️ Você foi derrotado...');
}

function getPlayerAttackText(enemyName, damage, isCrit) {
    let text = `⚔️ Você golpeia ${enemyName} e causa *${damage}* de dano!`;
    if (isCrit) text += `\n💥 *CRÍTICO!*`;
    return text;
}

function getEnemyAttackText(enemyName, damage, isCrit) {
    let text = `👹 ${enemyName} ataca e causa *${damage}* de dano!`;
    if (isCrit) text += `\n💀 *Golpe crítico!*`;
    return text;
}

function applyShieldDamage(target, damage, fight, ownerName = 'Escudo') {
    let remainingDamage = damage;

    if ((target.shield || 0) > 0) {
        const absorbed = Math.min(target.shield, remainingDamage);
        target.shield -= absorbed;
        remainingDamage -= absorbed;

        if (absorbed > 0) {
            fight.logs.push(`🛡️ ${ownerName} absorveu ${absorbed} de dano.`);
        }
    }

    return remainingDamage;
}

/*
=================================
CREATE
=================================
*/

function createFight(player, enemy) {
    return ensureFightShape({
        player: {
            id: player.id,
            name: player.name,
            className: player.class,
            hp: player.hp,
            maxHp: player.maxHp,
            atk: player.atk,
            def: player.def,
            crit: player.crit || 5,
            souls: Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null],
            shield: 0,
            energy: player.energy,
            maxEnergy: player.maxEnergy,
            buffs: [],
            defending: false,
            stunned: false
        },
        enemy: {
            id: enemy.id || enemy.name,
            name: enemy.name,
            emoji: enemy.emoji || '👹',
            hp: enemy.hp,
            maxHp: enemy.hp,
            atk: enemy.atk,
            def: enemy.def,
            crit: enemy.crit || 5,
            level: enemy.level || 1,
            xp: enemy.xp || 0,
            gold: enemy.gold || 0,
            isBoss: !!enemy.isBoss,
            isElite: !!enemy.isElite,
            isMiniBoss: !!enemy.isMiniBoss,
            ability: enemy.ability || null,
            frozen: false,
            poisonTurns: 0,
            bleedTurns: 0,
            shield: 0,
            buffs: []
        },
        turn: 1,
        status: 'ongoing',
        rewards: null,
        logs: [`🌑 Um *${enemy.name}* surgiu das sombras!`],
        lastDamageDealt: 0,
        lastDamageReceived: 0
    });
}

/*
=================================
PROCESSAMENTO DE EFEITOS DE STATUS
=================================
*/

function processEnemyStatusEffects(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return false;

    let enemyDied = false;

    if (fight.enemy.poisonTurns > 0) {
        ENEMY_ABILITIES.POISON.tick(fight.enemy, fight);
        if (fight.enemy.hp <= 0) {
            setVictory(fight);
            enemyDied = true;
        }
    }

    if (!enemyDied && fight.enemy.bleedTurns > 0) {
        ENEMY_ABILITIES.BLEED.tick(fight.enemy, fight);
        if (fight.enemy.hp <= 0) {
            setVictory(fight);
            enemyDied = true;
        }
    }

    return enemyDied;
}

/*
=================================
PLAYER TURN
=================================
*/

function processPlayerTurn(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return null;

    if (fight.player.stunned) {
        fight.logs.push('💫 Você está atordoado e perdeu o turno!');
        fight.player.stunned = false;
        fight.turn += 1;
        fight.logs = trimLogs(fight.logs);
        return null;
    }

    const result = calculateDamage(fight.player, fight.enemy);
    const actualDamage = applyShieldDamage(fight.enemy, result.damage, fight, 'Escudo inimigo');

    fight.enemy.hp = Math.max(0, fight.enemy.hp - actualDamage);
    fight.lastDamageDealt = actualDamage;

    fight.logs.push(getPlayerAttackText(fight.enemy.name, actualDamage, result.isCrit));

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
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return null;

    const enemyDied = processEnemyStatusEffects(fight);
    if (enemyDied) {
        fight.logs = trimLogs(fight.logs);
        return null;
    }

    if (fight.enemy.frozen) {
        fight.logs.push(`❄️ ${fight.enemy.name} está congelado e perdeu o turno!`);
        fight.enemy.frozen = false;
        fight.turn += 1;
        fight.logs = trimLogs(fight.logs);
        return null;
    }

    if (fight.enemy.ability) {
        const abilityDef = ENEMY_ABILITIES[fight.enemy.ability.type];
        if (abilityDef && Math.random() < (fight.enemy.ability.chance || 0.3)) {
            if (fight.enemy.ability.type === 'STUN') {
                abilityDef.apply(fight.player, fight);
            } else if (fight.enemy.ability.type === 'HEAL' || fight.enemy.ability.type === 'SHIELD') {
                abilityDef.apply(fight.enemy, fight);
                fight.player.defending = false;
                fight.turn += 1;
                fight.logs = trimLogs(fight.logs);
                return null;
            } else {
                abilityDef.apply(fight.enemy, fight);
            }
        }
    }

    const multiplier = fight.player.defending ? 0.5 : 1;
    const result = calculateDamage(fight.enemy, fight.player, { multiplier });

    const actualDamage = applyShieldDamage(fight.player, result.damage, fight, 'Seu escudo');

    fight.player.hp = Math.max(0, fight.player.hp - actualDamage);
    fight.lastDamageReceived = actualDamage;

    fight.logs.push(getEnemyAttackText(fight.enemy.name, actualDamage, result.isCrit));

    if (fight.player.hp <= 0) {
        setLoss(fight);
    }

    fight.player.defending = false;
    fight.turn += 1;
    fight.logs = trimLogs(fight.logs);
    return result;
}

/*
=================================
SOUL
=================================
*/

function useSoul(fight, soulIndex) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return null;

    const index = Number(soulIndex);
    const soul = fight.player.souls[index];

    if (!soul) {
        fight.logs.push('❌ Alma vazia.');
        fight.logs = trimLogs(fight.logs);
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
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return;
    fight.player.defending = true;
    fight.logs.push('🛡️ Você assume postura defensiva.');
    fight.logs = trimLogs(fight.logs);
}

function attemptFlee(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return false;

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