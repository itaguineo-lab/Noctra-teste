function ensureEnergyFields(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    if (typeof player.maxEnergy !== 'number') {
        player.maxEnergy = player.vip ? 40 : 20;
    }

    if (typeof player.energy !== 'number') {
        player.energy = player.maxEnergy;
    }

    if (!player.lastEnergyUpdate) {
        player.lastEnergyUpdate = Date.now();
    }

    return player;
}

function getRegenInterval(player) {
    return player.vip
        ? 3 * 60 * 1000
        : 6 * 60 * 1000;
}

function updateEnergy(player) {
    ensureEnergyFields(player);

    const now = Date.now();
    const interval = getRegenInterval(player);

    const elapsed =
        now - player.lastEnergyUpdate;

    if (elapsed < interval) {
        return false;
    }

    const amount = Math.floor(
        elapsed / interval
    );

    if (player.energy >= player.maxEnergy) {
        player.lastEnergyUpdate = now;
        return false;
    }

    player.energy = Math.min(
        player.maxEnergy,
        player.energy + amount
    );

    player.lastEnergyUpdate +=
        amount * interval;

    return true;
}

function consumeEnergy(player, amount = 1) {
    ensureEnergyFields(player);

    const value = Number(amount) || 1;

    if (player.energy < value) {
        return false;
    }

    const wasFull =
        player.energy === player.maxEnergy;

    player.energy -= value;

    if (wasFull) {
        player.lastEnergyUpdate = Date.now();
    }

    return true;
}

function getTimeToNextEnergy(player) {
    ensureEnergyFields(player);

    if (player.energy >= player.maxEnergy) {
        return 0;
    }

    const interval = getRegenInterval(player);

    const elapsed =
        Date.now() - player.lastEnergyUpdate;

    return Math.max(0, interval - elapsed);
}

module.exports = {
    updateEnergy,
    consumeEnergy,
    getTimeToNextEnergy,
    getRegenInterval
};