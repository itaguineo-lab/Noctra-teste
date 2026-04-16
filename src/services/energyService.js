function ensureEnergyFields(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    if (typeof player.maxEnergy !== 'number' || Number.isNaN(player.maxEnergy)) {
        player.maxEnergy = player.vip ? 40 : 20;
    }

    if (typeof player.energy !== 'number' || Number.isNaN(player.energy)) {
        player.energy = player.maxEnergy;
    }

    if (!player.lastEnergyUpdate) {
        player.lastEnergyUpdate = Date.now();
    }

    return player;
}

/*
=================================
INTERVALO DE REGENERAÇÃO
Normal: 10 minutos
VIP: 8 minutos
=================================
*/

function getRegenInterval(player) {
    return player.vip ? 8 * 60 * 1000 : 10 * 60 * 1000;
}

/*
=================================
ATUALIZA ENERGIA (PASSIVA)
=================================
*/

function updateEnergy(player) {
    ensureEnergyFields(player);

    const now = Date.now();
    const interval = getRegenInterval(player);
    const elapsed = now - new Date(player.lastEnergyUpdate).getTime();

    if (elapsed < interval) {
        return false;
    }

    if (player.energy >= player.maxEnergy) {
        player.energy = player.maxEnergy;
        player.lastEnergyUpdate = now;
        return false;
    }

    const amount = Math.floor(elapsed / interval);
    player.energy = Math.min(player.maxEnergy, player.energy + amount);

    const baseTime = new Date(player.lastEnergyUpdate).getTime();
    player.lastEnergyUpdate = baseTime + (amount * interval);

    if (player.energy >= player.maxEnergy) {
        player.energy = player.maxEnergy;
        player.lastEnergyUpdate = now;
    }

    return true;
}

/*
=================================
CONSUMO DE ENERGIA
=================================
*/

function consumeEnergy(player, amount = 1) {
    ensureEnergyFields(player);

    const value = Number(amount) || 1;
    if (value <= 0) return false;

    updateEnergy(player);

    if (player.energy < value) return false;

    const wasFull = player.energy === player.maxEnergy;
    player.energy -= value;

    if (wasFull) {
        player.lastEnergyUpdate = Date.now();
    }

    return true;
}

/*
=================================
RECUPERA ENERGIA
=================================
*/

function restoreEnergy(player, amount = 1) {
    ensureEnergyFields(player);

    const value = Math.max(0, Number(amount) || 0);
    if (value <= 0) return player;

    updateEnergy(player);
    player.energy = Math.min(player.maxEnergy, player.energy + value);

    return player;
}

/*
=================================
TEMPO ATÉ PRÓXIMA ENERGIA
=================================
*/

function getTimeToNextEnergy(player) {
    ensureEnergyFields(player);
    updateEnergy(player);

    if (player.energy >= player.maxEnergy) {
        return 0;
    }

    const interval = getRegenInterval(player);
    const elapsed = Date.now() - new Date(player.lastEnergyUpdate).getTime();

    return Math.max(0, interval - elapsed);
}

/*
=================================
TEMPO ATÉ ENERGIA CHEIA
=================================
*/

function getTimeToFullEnergy(player) {
    ensureEnergyFields(player);
    updateEnergy(player);

    if (player.energy >= player.maxEnergy) {
        return 0;
    }

    const missing = player.maxEnergy - player.energy;
    const nextTick = getTimeToNextEnergy(player);
    const interval = getRegenInterval(player);

    return nextTick + Math.max(0, missing - 1) * interval;
}

/*
=================================
FORMATAÇÃO
=================================
*/

function formatEnergyTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

module.exports = {
    updateEnergy,
    consumeEnergy,
    restoreEnergy,
    getTimeToNextEnergy,
    getTimeToFullEnergy,
    getRegenInterval,
    formatEnergyTime
};