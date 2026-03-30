const { recalculateStats } = require('./playerService');

function getXpToNextLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}

function addXp(player, amount) {
    player.xp += amount;

    return checkLevelUp(player);
}

function checkLevelUp(player) {
    let leveledUp = false;

    while (player.xp >= getXpToNextLevel(player.level)) {
        player.xp -= getXpToNextLevel(player.level);
        player.level++;
        leveledUp = true;
    }

    if (leveledUp) {
        recalculateStats(player);

        player.hp = player.maxHp;
        player.energy = player.maxEnergy;
    }

    return leveledUp;
}

module.exports = {
    getXpToNextLevel,
    addXp,
    checkLevelUp
};