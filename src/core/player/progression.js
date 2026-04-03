const { recalculateStats } = require('./playerService');

function getXpToNextLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.2));
}

function getLevelUpRewards(player) {
    const rewards = {
        healPercent: 0.35,
        energyRestore: 5,
        glorias: 0
    };

    // bônus por marcos
    if (player.level % 5 === 0) {
        rewards.glorias = 1;
    }

    return rewards;
}

function addXp(player, amount) {
    player.xp = (player.xp || 0) + amount;
    return checkLevelUp(player);
}

function checkLevelUp(player) {
    let leveledUp = false;
    let levelsGained = 0;

    while (player.xp >= getXpToNextLevel(player.level)) {
        player.xp -= getXpToNextLevel(player.level);
        player.level++;
        levelsGained++;
        leveledUp = true;
    }

    if (!leveledUp) {
        return false;
    }

    const oldMaxHp = player.maxHp || 0;

    recalculateStats(player);

    const rewards = getLevelUpRewards(player);

    /*
      CURA PARCIAL
      Muito melhor para boss fights
    */
    const healAmount = Math.floor(player.maxHp * rewards.healPercent);

    if (typeof player.hp !== 'number') {
        player.hp = player.maxHp;
    }

    player.hp = Math.min(player.maxHp, player.hp + healAmount);

    /*
      Recuperação parcial de energia
    */
    player.energy = Math.min(
        player.maxEnergy,
        (player.energy || 0) + rewards.energyRestore
    );

    /*
      Recompensa por marco
    */
    if (rewards.glorias > 0) {
        player.glorias = (player.glorias || 0) + rewards.glorias;
    }

    /*
      Compensa aumento de max HP
    */
    const hpIncrease = player.maxHp - oldMaxHp;
    if (hpIncrease > 0) {
        player.hp = Math.min(player.maxHp, player.hp + hpIncrease);
    }

    return {
        success: true,
        leveledUp: true,
        levelsGained,
        healAmount,
        energyRestored: rewards.energyRestore,
        gloriasGained: rewards.glorias
    };
}

module.exports = {
    getXpToNextLevel,
    addXp,
    checkLevelUp
};