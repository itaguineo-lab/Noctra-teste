const {
    recalculateStats,
    isVipActive
} = require('./playerService');

/*
=================================
XP CURVE 3.1
OBJETIVO:
- LV 1–4 com progressão rápida para criar tração inicial
- LV 5–8 ainda acessível, mas já com atrito suficiente
- LV 8 marca a entrada real na Cripta
- após LV 8 desacelera forte para proteger longevidade
=================================
*/

function getXpToNextLevel(level) {
    const lv = Math.max(1, Number(level) || 1);

    if (lv <= 4) {
        return Math.floor(75 + (lv - 1) * 30);
    }

    if (lv <= 8) {
        return Math.floor(180 + (lv - 5) * 45);
    }

    /*
    A partir daqui a curva sobe de verdade.
    */
    if (lv <= 12) {
        return Math.floor(400 + (lv - 9) * 95);
    }

    if (lv <= 16) {
        return Math.floor(780 + (lv - 13) * 140);
    }

    if (lv <= 24) {
        return Math.floor(1340 + (lv - 17) * 190);
    }

    if (lv <= 35) {
        return Math.floor(2860 + (lv - 25) * 260);
    }

    return Math.floor(5720 + (lv - 36) * 340);
}

function getDeathPenaltyRate(player) {
    return isVipActive(player) ? 0.05 : 0.10;
}

function getTotalXp(player) {
    const level = Math.max(1, Number(player?.level || 1));
    let total = Math.max(0, Number(player?.xp || 0));

    for (let lv = 1; lv < level; lv++) {
        total += getXpToNextLevel(lv);
    }

    return total;
}

function setProgressFromTotalXp(player, totalXp) {
    let remaining = Math.max(0, Math.floor(Number(totalXp) || 0));
    let level = 1;

    while (remaining >= getXpToNextLevel(level)) {
        remaining -= getXpToNextLevel(level);
        level += 1;
    }

    player.level = level;
    player.xp = remaining;
    recalculateStats(player);
    return player;
}

/*
=================================
LEVEL REWARDS
=================================
*/

function getLevelUpRewards(player) {
    const level = Math.max(1, Number(player.level || 1));

    const rewards = {
        healPercent: level <= 8 ? 0.45 : 0.35,
        energyRestore: level <= 8 ? 6 : 4,
        glorias: 0,
        keys: 0
    };

    if (level % 5 === 0) {
        rewards.glorias = 1;
    }

    if (level % 12 === 0) {
        rewards.keys = 1;
    }

    return rewards;
}

/*
=================================
ADD XP
=================================
*/

function addXp(player, amount) {
    const xpGain = Math.max(0, Number(amount) || 0);
    player.xp = (player.xp || 0) + xpGain;
    return checkLevelUp(player);
}

/*
=================================
LOSE XP ON DEATH
=================================
*/

function applyDeathXpPenalty(player, percent = null) {
    const totalXpBefore = getTotalXp(player);
    const penaltyRate = Math.max(0, Number(percent ?? getDeathPenaltyRate(player)) || 0);
    const oldLevel = Math.max(1, Number(player.level || 1));
    const oldLevelXp = Math.max(0, Number(player.xp || 0));

    if (totalXpBefore <= 0 || penaltyRate <= 0) {
        return {
            success: true,
            lostXp: 0,
            remainingXp: oldLevelXp,
            totalXpBefore,
            totalXpAfter: totalXpBefore,
            oldLevel,
            newLevel: oldLevel,
            levelReduced: false,
            rateApplied: penaltyRate
        };
    }

    const lostXp = Math.max(1, Math.floor(totalXpBefore * penaltyRate));
    const totalXpAfter = Math.max(0, totalXpBefore - lostXp);

    setProgressFromTotalXp(player, totalXpAfter);

    return {
        success: true,
        lostXp,
        remainingXp: player.xp,
        totalXpBefore,
        totalXpAfter,
        oldLevel,
        newLevel: player.level,
        levelReduced: player.level < oldLevel,
        rateApplied: penaltyRate
    };
}

/*
=================================
LEVEL UP

FIX: HP double-add removido.

O código anterior fazia:
1. recalculateStats(player)       → player.maxHp cresce (ex: de 120 para 128)
2. healAmount = maxHp * percent   → calculado sobre o novo maxHp (128 * 0.40 = 51)
3. player.hp += healAmount        → hp sobe 51
4. hpIncrease = maxHp - oldMaxHp → 128 - 120 = 8
5. player.hp += hpIncrease        → hp sobe mais 8 (DUPLO)

O problema: healAmount já foi calculado sobre o novo maxHp, então
o crescimento de stat (+8) já estava embutido no cálculo do heal.
Adicionar hpIncrease por cima era dupla contagem.

Resultado do bug: ao upar vários níveis de uma vez, o HP final
ficava inflado incorretamente, podendo até ultrapassar maxHp
antes do Math.min (que corrija) se múltiplos levels fossem ganhos.

Fix: removido o bloco hpIncrease. O heal percentual sobre o novo
maxHp já cobre o crescimento de stat corretamente.
=================================
*/

function checkLevelUp(player) {
    let leveledUp = false;
    let levelsGained = 0;

    let totalEnergy = 0;
    let totalGlorias = 0;
    let totalKeys = 0;

    const oldLevel = player.level || 1;
    const oldAtk = player.atk || 0;
    const oldDef = player.def || 0;
    const oldMaxHp = player.maxHp || 0;

    while (player.xp >= getXpToNextLevel(player.level)) {
        const xpNeeded = getXpToNextLevel(player.level);

        player.xp -= xpNeeded;
        player.level++;
        levelsGained++;
        leveledUp = true;

        const rewards = getLevelUpRewards(player);

        totalEnergy += rewards.energyRestore;
        totalGlorias += rewards.glorias;
        totalKeys += rewards.keys;
    }

    if (!leveledUp) {
        return {
            success: false,
            leveledUp: false
        };
    }

    /*
    recalculateStats atualiza player.maxHp para o novo nível.
    O heal percentual é calculado APÓS esse update, então
    já reflete o maxHp crescido. Não adicionar hpIncrease separadamente.
    */
    recalculateStats(player);

    const effectiveHealPercent = player.level <= 10
        ? 0.45
        : player.level <= 24
            ? 0.30
            : 0.24;

    const healAmount = Math.floor(player.maxHp * effectiveHealPercent * levelsGained);

    player.hp = Math.min(
        player.maxHp,
        (player.hp || 0) + healAmount
    );

    player.energy = Math.min(
        player.maxEnergy,
        (player.energy || 0) + totalEnergy
    );

    player.glorias = (player.glorias || 0) + totalGlorias;
    player.keys = (player.keys || 0) + totalKeys;

    return {
        success: true,
        leveledUp: true,
        oldLevel,
        newLevel: player.level,
        levelsGained,
        healAmount,
        energyRestored: totalEnergy,
        gloriasGained: totalGlorias,
        keysGained: totalKeys,
        oldStats: {
            atk: oldAtk,
            def: oldDef,
            hp: oldMaxHp
        },
        newStats: {
            atk: player.atk,
            def: player.def,
            hp: player.maxHp
        }
    };
}

/*
=================================
PROGRESS BAR DATA
=================================
*/

function getLevelProgress(player) {
    const currentXp = player.xp || 0;
    const neededXp = getXpToNextLevel(player.level);

    const percent = Math.floor((currentXp / neededXp) * 100);

    return {
        currentXp,
        neededXp,
        percent: Math.max(0, Math.min(100, percent))
    };
}

module.exports = {
    getXpToNextLevel,
    getLevelUpRewards,
    getDeathPenaltyRate,
    getTotalXp,
    setProgressFromTotalXp,
    addXp,
    applyDeathXpPenalty,
    checkLevelUp,
    getLevelProgress
};
