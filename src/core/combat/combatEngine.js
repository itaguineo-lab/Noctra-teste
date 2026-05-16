const { calculateDamage } = require('./damageCalc');
const {
    activateSoul,
    getSoulCooldownTurns,
    isPassiveSoul
} = require('../player/souls');
const { ENEMY_ABILITIES } = require('../world/enemies');

/*
=================================
HELPERS
=================================
*/

function trimLogs(logs, max = 8) {
    return Array.isArray(logs) ? logs.slice(-max) : [];
}

function ensureSoulCooldowns(fight) {
    fight.player ??= {};

    if (!Array.isArray(fight.player.soulCooldowns)) {
        fight.player.soulCooldowns = [0, 0];
    }

    while (fight.player.soulCooldowns.length < 2) {
        fight.player.soulCooldowns.push(0);
    }

    fight.player.soulCooldowns = fight.player.soulCooldowns
        .slice(0, 2)
        .map(value => Math.max(0, Number(value) || 0));

    return fight.player.soulCooldowns;
}

function tickSoulCooldowns(fight) {
    const cooldowns = ensureSoulCooldowns(fight);

    fight.player.soulCooldowns = cooldowns.map(value => Math.max(0, value - 1));
    return fight.player.soulCooldowns;
}

function getSoulCooldownRemaining(fight, soulIndex) {
    const cooldowns = ensureSoulCooldowns(fight);
    const index = Number(soulIndex);

    if (!Number.isInteger(index) || index < 0 || index >= cooldowns.length) {
        return 0;
    }

    return Math.max(0, Number(cooldowns[index] || 0));
}

function setSoulCooldown(fight, soulIndex, soul) {
    const cooldowns = ensureSoulCooldowns(fight);
    const index = Number(soulIndex);

    if (!Number.isInteger(index) || index < 0 || index >= cooldowns.length) {
        return cooldowns;
    }

    cooldowns[index] = getSoulCooldownTurns(soul);
    fight.player.soulCooldowns = cooldowns;
    return cooldowns;
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

    fight.player.level ??= 1;
    fight.player.shield ??= 0;
    fight.player.buffs ??= [];
    fight.player.defending ??= false;
    fight.player.stunned ??= false;
    fight.player.poisonTurns ??= 0;
    fight.player.bleedTurns ??= 0;
    fight.player.souls ??= [null, null];
    ensureSoulCooldowns(fight);

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
    fight.logs.push(`💀 ${fight.enemy.name} tombou nas sombras`);
}

function setLoss(fight) {
    if (fight.status === 'loss') return;

    fight.status = 'loss';
    fight.logs.push('☠️ Você foi derrotado');
}

function getPlayerAttackText(enemyName, damage, isCrit) {
    let text = `⚔️ Você golpeia ${enemyName} e causa ${damage} de dano`;
    if (isCrit) text += `\n💥 Crítico`;
    return text;
}

function getEnemyAttackText(enemyName, damage, isCrit) {
    let text = `👹 ${enemyName} ataca e causa ${damage} de dano`;
    if (isCrit) text += `\n💀 Golpe crítico`;
    return text;
}

function applyShieldDamage(target, damage, fight, ownerName = 'Escudo') {
    let remainingDamage = damage;

    if ((target.shield || 0) > 0) {
        const absorbed = Math.min(target.shield, remainingDamage);
        target.shield -= absorbed;
        remainingDamage -= absorbed;

        if (absorbed > 0) {
            fight.logs.push(`🛡️ ${ownerName} absorveu ${absorbed} de dano`);
        }
    }

    return remainingDamage;
}

function applyDamageOverTime(target, fight, config) {
    const turnsKey = config.turnsKey;
    const percent = config.percent;
    const emoji = config.emoji;
    const label = config.label;
    const targetName = config.targetName;

    if ((target[turnsKey] || 0) <= 0) return false;

    const baseHp = Math.max(1, Number(target.maxHp || target.hp || 1));
    const damage = Math.max(1, Math.floor(baseHp * percent));

    target.hp = Math.max(0, (target.hp || 0) - damage);
    target[turnsKey] -= 1;

    fight.logs.push(`${emoji} ${label} causa ${damage} de dano em ${targetName}`);
    return target.hp <= 0;
}

function applyEnemyStatusToPlayer(fight, type) {
    ensureFightShape(fight);
    const abilityDef = ENEMY_ABILITIES[type];
    if (abilityDef) {
        abilityDef.apply(fight.player, fight);
        return true;
    }
    return false;
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
            level: player.level || 1,
            hp: player.hp,
            maxHp: player.maxHp,
            atk: player.atk,
            def: player.def,
            crit: player.crit || 5,
            souls: Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null],
            soulCooldowns: [0, 0],
            shield: 0,
            energy: player.energy,
            maxEnergy: player.maxEnergy,
            buffs: [],
            defending: false,
            stunned: false,
            poisonTurns: 0,
            bleedTurns: 0
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
        logs: [`🌑 Um ${enemy.name} surgiu das sombras`],
        lastDamageDealt: 0,
        lastDamageReceived: 0
    });
}

/*
=================================
PROCESSAMENTO DE EFEITOS DE STATUS
=================================
*/

function processPlayerStatusEffects(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return false;

    const poisonedToDeath = applyDamageOverTime(fight.player, fight, {
        turnsKey: 'poisonTurns',
        percent: 0.04,
        emoji: '🧪',
        label: 'Veneno',
        targetName: 'você'
    });

    if (poisonedToDeath) {
        setLoss(fight);
        return true;
    }

    const bledToDeath = applyDamageOverTime(fight.player, fight, {
        turnsKey: 'bleedTurns',
        percent: 0.035,
        emoji: '🩸',
        label: 'Sangramento',
        targetName: 'você'
    });

    if (bledToDeath) {
        setLoss(fight);
        return true;
    }

    return false;
}

function processEnemyStatusEffects(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return false;

    const poisonedToDeath = applyDamageOverTime(fight.enemy, fight, {
        turnsKey: 'poisonTurns',
        percent: 0.05,
        emoji: '🧪',
        label: 'Veneno',
        targetName: fight.enemy.name
    });

    if (poisonedToDeath) {
        setVictory(fight);
        return true;
    }

    const bledToDeath = applyDamageOverTime(fight.enemy, fight, {
        turnsKey: 'bleedTurns',
        percent: 0.04,
        emoji: '🩸',
        label: 'Sangramento',
        targetName: fight.enemy.name
    });

    if (bledToDeath) {
        setVictory(fight);
        return true;
    }

    return false;
}

/*
=================================
PLAYER TURN
=================================
*/

function processPlayerTurn(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return null;

    tickSoulCooldowns(fight);

    const playerDiedByStatus = processPlayerStatusEffects(fight);
    if (playerDiedByStatus) {
        fight.logs = trimLogs(fight.logs);
        return null;
    }

    if (fight.player.stunned) {
        fight.logs.push('💫 Você está atordoado e perdeu o turno');
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
        fight.logs.push(`❄️ ${fight.enemy.name} está congelado e perdeu o turno`);
        fight.enemy.frozen = false;
        fight.turn += 1;
        fight.logs = trimLogs(fight.logs);
        return null;
    }

    if (fight.enemy.ability) {
        const abilityType = fight.enemy.ability.type;
        const abilityDef = ENEMY_ABILITIES[abilityType];

        if (abilityDef && Math.random() < (fight.enemy.ability.chance || 0.3)) {
            if (abilityType === 'POISON' || abilityType === 'BLEED') {
                applyEnemyStatusToPlayer(fight, abilityType);
            } else if (abilityType === 'STUN') {
                abilityDef.apply(fight.player, fight);
            } else if (abilityType === 'HEAL' || abilityType === 'SHIELD') {
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
        fight.logs.push('❌ Alma vazia');
        fight.logs = trimLogs(fight.logs);
        return null;
    }

    if (isPassiveSoul(soul)) {
        fight.logs.push(`${soul.emoji || '💀'} ${soul.name} é passiva e já fortalece sua build`);
        fight.logs = trimLogs(fight.logs);
        return {
            success: false,
            passive: true,
            message: 'Alma passiva não é ativável'
        };
    }

    const cooldownRemaining = getSoulCooldownRemaining(fight, index);
    if (cooldownRemaining > 0) {
        fight.logs.push(`⏳ ${soul.name} recarrega em ${cooldownRemaining} turnos`);
        fight.logs = trimLogs(fight.logs);
        return {
            success: false,
            cooldown: cooldownRemaining,
            message: `Alma em recarga por ${cooldownRemaining} turnos`
        };
    }

    tickSoulCooldowns(fight);

    const result = activateSoul(soul, fight);
    if (!result?.success) {
        if (result?.message) fight.logs.push(result.message);
        fight.logs = trimLogs(fight.logs);
        return result || null;
    }

    setSoulCooldown(fight, index, soul);

    if (result?.message) {
        fight.logs.push(result.message);
    }

    const cooldown = getSoulCooldownTurns(soul);
    if (cooldown > 0) {
        fight.logs.push(`⏳ ${soul.name} entrou em recarga por ${cooldown} turnos`);
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
    tickSoulCooldowns(fight);
    fight.player.defending = true;
    fight.logs.push('🛡️ Você assume postura defensiva');
    fight.logs = trimLogs(fight.logs);
}

function attemptFlee(fight) {
    ensureFightShape(fight);

    if (fight.status !== 'ongoing') return false;

    const success = Math.random() <= 0.6;

    if (success) {
        fight.status = 'fled';
        fight.logs.push('🏃 Você fugiu');
    } else {
        fight.logs.push('🚫 Falha na fuga');
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
    applyDefend,
    ensureSoulCooldowns,
    tickSoulCooldowns,
    getSoulCooldownRemaining,
    setSoulCooldown
};
