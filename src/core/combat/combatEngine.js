const { calculateDamage } = require('./damageCalc');
const { activateSoul } = require('../player/souls');

function trimLogs(logs, max = 8) {
    return logs.slice(-max);
}

function setVictory(fight) {
    if (fight.status === 'win') return;
    fight.status = 'win';
    fight.rewards = {
        xp: fight.enemy.xp,
        gold: fight.enemy.gold
    };
    fight.logs.push(`💀 ${fight.enemy.name} foi derrotado!`);
}

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
            souls: Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null],
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
        logs: [`⚔️ Um ${enemy.name} surgiu das sombras!`],
        lastDamageDealt: 0,
        lastDamageReceived: 0
    };
}

function applyDefend(fight) {
    fight.player.defending = true;
}

function applyTurnEffects(fight) {
    if (fight.status !== 'ongoing') return false;

    if (fight.enemy.bleedTurns > 0) {
        const bleedDamage = Math.max(1, Math.floor(fight.enemy.maxHp * 0.05));
        fight.enemy.hp = Math.max(0, fight.enemy.hp - bleedDamage);
        fight.logs.push(`🩸 Sangramento causou *${bleedDamage}* dano.`);
        fight.enemy.bleedTurns--;
    }

    if (fight.enemy.poisonTurns > 0) {
        const poisonDamage = Math.max(1, Math.floor(fight.enemy.maxHp * 0.04));
        fight.enemy.hp = Math.max(0, fight.enemy.hp - poisonDamage);
        fight.logs.push(`☠️ Veneno causou *${poisonDamage}* dano.`);
        fight.enemy.poisonTurns--;
    }

    if (fight.enemy.hp <= 0) {
        setVictory(fight);
        return true;
    }
    return false;
}

function normalAttack(fight) {
    const result = calculateDamage(fight.player, fight.enemy);
    fight.enemy.hp = Math.max(0, fight.enemy.hp - result.damage);
    fight.lastDamageDealt = result.damage;
    fight.logs.push(
        result.isCrit
            ? `💥 CRÍTICO! Você causou *${result.damage}* dano!`
            : `🗡️ Você causou *${result.damage}* dano!`
    );
    return result;
}

function useSoul(fight, soulIndex) {
    if (fight.status !== 'ongoing') return null;
    const soul = fight.player.souls[soulIndex];
    if (!soul) {
        fight.logs.push('❌ Nenhuma alma equipada neste slot.');
        return null;
    }
    const result = activateSoul(soul, fight);
    if (result?.message) fight.logs.push(result.message);
    applyTurnEffects(fight);
    if (fight.enemy.hp <= 0) setVictory(fight);
    fight.logs = trimLogs(fight.logs);
    return result;
}

function processPlayerTurn(fight) {
    if (fight.status !== 'ongoing') return null;
    const result = normalAttack(fight);
    applyTurnEffects(fight);
    if (fight.enemy.hp <= 0) setVictory(fight);
    fight.logs = trimLogs(fight.logs);
    return result;
}

function processEnemyTurn(fight) {
    if (fight.status !== 'ongoing') return null;
    if (fight.enemy.frozen) {
        fight.logs.push(`❄️ ${fight.enemy.name} está congelado e perdeu o turno.`);
        fight.enemy.frozen = false;
        fight.turn++;
        return null;
    }

    // Aplica redução de dano se o jogador estiver defendendo
    let damageMultiplier = 1;
    if (fight.player.defending) {
        damageMultiplier = 0.5;
        fight.logs.push(`🛡️ ${fight.player.name} defende e reduz o dano pela metade!`);
    }

    const result = calculateDamage(fight.enemy, fight.player, { multiplier: damageMultiplier });
    fight.player.hp = Math.max(0, fight.player.hp - result.damage);
    fight.lastDamageReceived = result.damage;
    fight.logs.push(
        result.isCrit
            ? `💥 CRÍTICO! ${fight.enemy.name} causou *${result.damage}* dano!`
            : `👹 ${fight.enemy.name} causou *${result.damage}* dano!`
    );
    if (fight.player.hp <= 0) {
        fight.status = 'loss';
        fight.logs.push(`☠️ Você foi derrotado por ${fight.enemy.name}...`);
    }
    fight.turn++;
    fight.logs = trimLogs(fight.logs);
    return result;
}

function attemptFlee(fight) {
    if (fight.status !== 'ongoing') return false;
    const success = Math.random() <= 0.6;
    if (success) {
        fight.status = 'fled';
        fight.logs.push('🏃 Você fugiu com sucesso.');
    } else {
        fight.logs.push('🚫 Não conseguiu fugir!');
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