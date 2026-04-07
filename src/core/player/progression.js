const {
    recalculateStats
} = require('./playerService');

/*
=================================
XP CURVE
=================================
*/

function getXpToNextLevel(level) {
    const lv = Math.max(
        1,
        Number(level) || 1
    );

    /*
    curva progressiva:
    rápida no early,
    mais forte no mid/late
    */

    return Math.floor(
        100 *
        Math.pow(lv, 1.18) +
        lv * 12
    );
}

/*
=================================
LEVEL REWARDS
=================================
*/

function getLevelUpRewards(player) {
    const rewards = {
        healPercent: 0.35,
        energyRestore: 5,
        glorias: 0,
        keys: 0
    };

    /*
    milestones
    */

    if (player.level % 5 === 0) {
        rewards.glorias = 1;
    }

    if (player.level % 10 === 0) {
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
    const xpGain = Math.max(
        0,
        Number(amount) || 0
    );

    player.xp =
        (player.xp || 0) + xpGain;

    return checkLevelUp(player);
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

    const oldLevel =
        player.level || 1;

    const oldMaxHp =
        player.maxHp || 0;

    const oldAtk =
        player.atk || 0;

    const oldDef =
        player.def || 0;

    /*
    múltiplos levels
    */

    while (
        player.xp >=
        getXpToNextLevel(
            player.level
        )
    ) {
        const xpNeeded =
            getXpToNextLevel(
                player.level
            );

        player.xp -= xpNeeded;

        player.level++;

        levelsGained++;

        leveledUp = true;

        const rewards =
            getLevelUpRewards(
                player
            );

        totalEnergy +=
            rewards.energyRestore;

        totalGlorias +=
            rewards.glorias;

        totalKeys +=
            rewards.keys;
    }

    if (!leveledUp) {
        return {
            success: false,
            leveledUp: false
        };
    }

    /*
    recalcula stats
    */

    recalculateStats(player);

    /*
    cura parcial
    */

    const healAmount =
        Math.floor(
            player.maxHp *
            0.35 *
            levelsGained
        );

    totalHeal =
        healAmount;

    player.hp = Math.min(
        player.maxHp,
        (player.hp || 0) +
            healAmount
    );

    /*
    energia
    */

    player.energy = Math.min(
        player.maxEnergy,
        (player.energy || 0) +
            totalEnergy
    );

    /*
    milestones
    */

    player.glorias =
        (player.glorias || 0) +
        totalGlorias;

    player.keys =
        (player.keys || 0) +
        totalKeys;

    /*
    compensa hp extra
    */

    const hpIncrease =
        player.maxHp -
        oldMaxHp;

    if (hpIncrease > 0) {
        player.hp = Math.min(
            player.maxHp,
            player.hp +
                hpIncrease
        );
    }

    return {
        success: true,
        leveledUp: true,
        oldLevel,
        newLevel:
            player.level,
        levelsGained,
        healAmount:
            totalHeal,
        energyRestored:
            totalEnergy,
        gloriasGained:
            totalGlorias,
        keysGained:
            totalKeys,
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
    const currentXp =
        player.xp || 0;

    const neededXp =
        getXpToNextLevel(
            player.level
        );

    const percent =
        Math.floor(
            (currentXp /
                neededXp) *
                100
        );

    return {
        currentXp,
        neededXp,
        percent: Math.max(
            0,
            Math.min(
                100,
                percent
            )
        )
    };
}

module.exports = {
    getXpToNextLevel,
    getLevelUpRewards,
    addXp,
    checkLevelUp,
    getLevelProgress
};