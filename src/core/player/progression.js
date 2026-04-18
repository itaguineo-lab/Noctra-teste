const {
    recalculateStats
} = require('./playerService');

/*
=================================
XP CURVE 2.0
FOCO EM PACING PROFISSIONAL
- EARLY: rápido e viciante
- MID: consistente
- LATE: desaceleração saudável
=================================
*/

function getXpToNextLevel(level) {
    const lv = Math.max(1, Number(level) || 1);

    /*
    Metas de pacing:
    Lv 1–4   = onboarding forte
    Lv 5–8   = ainda rápido
    Lv 9–15  = progressão estável
    Lv 16–24 = build e dungeon começam a pesar
    Lv 25+   = longevidade real
    */

    if (lv <= 4) {
        return Math.floor(90 + (lv - 1) * 28);
    }

    if (lv <= 8) {
        return Math.floor(180 + (lv - 5) * 42);
    }

    if (lv <= 15) {
        return Math.floor(320 + (lv - 9) * 62);
    }

    if (lv <= 24) {
        return Math.floor(760 + (lv - 16) * 95);
    }

    if (lv <= 35) {
        return Math.floor(1650 + (lv - 25) * 135);
    }

    return Math.floor(3135 + (lv - 36) * 185);
}

/*
=================================
LEVEL REWARDS
=================================
*/

function getLevelUpRewards(player) {
    const level = Math.max(1, Number(player.level || 1));

    const rewards = {
        healPercent: 0.35,
        energyRestore: level <= 8 ? 5 : 4,
        glorias: 0,
        keys: 0
    };

    /*
    Glória deve existir como marco.
    */
    if (level % 5 === 0) {
        rewards.glorias = 1;
    }

    /*
    Chave por level up é rara.
    Mantém valor da dungeon.
    */
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

function applyDeathXpPenalty(player, percent = 0.05) {
    const currentXp = Math.max(0, Number(player.xp) || 0);
    const penaltyRate = Math.max(0, Number(percent) || 0);

    if (currentXp <= 0 || penaltyRate <= 0) {
        return {
            success: true,
            lostXp: 0,
            remainingXp: currentXp
        };
    }

    const lostXp = Math.max(1, Math.floor(currentXp * penaltyRate));
    player.xp = Math.max(0, currentXp - lostXp);

    return {
        success: true,
        lostXp,
        remainingXp: player.xp
    };
}

/*
=================================
LEVEL UP
=================================
*/

function checkLevelUp(player) {
    let leveledUp = false;
    let levelsGained = 0;

    let totalHeal = 0;
    let totalEnergy = 0;
    let totalGlorias = 0;
    let totalKeys = 0;

    const oldLevel = player.level || 1;
    const oldMaxHp = player.maxHp || 0;
    const oldAtk = player.atk || 0;
    const oldDef = player.def || 0;

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

    recalculateStats(player);

    /*
    Quanto maior o level, menos o level up deve trivializar recuperação.
    */
    const effectiveHealPercent = player.level <= 10
        ? 0.40
        : player.level <= 24
            ? 0.32
            : 0.26;

    const healAmount = Math.floor(player.maxHp * effectiveHealPercent * levelsGained);
    totalHeal = healAmount;

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

    const hpIncrease = player.maxHp - oldMaxHp;
    if (hpIncrease > 0) {
        player.hp = Math.min(player.maxHp, player.hp + hpIncrease);
    }

    return {
        success: true,
        leveledUp: true,
        oldLevel,
        newLevel: player.level,
        levelsGained,
        healAmount: totalHeal,
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
    addXp,
    applyDeathXpPenalty,
    checkLevelUp,
    getLevelProgress
};