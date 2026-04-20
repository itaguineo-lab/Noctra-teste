const { BALANCE } = require('../data/balance');

function toTimestamp(value, fallback = Date.now()) {
    if (value instanceof Date) return value.getTime();

    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;

    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    return fallback;
}

function getExpectedMaxEnergy(player) {
    return player?.vip
        ? BALANCE.energy.vipMax
        : BALANCE.energy.baseMax;
}

function ensureEnergyFields(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    const expectedMaxEnergy = getExpectedMaxEnergy(player);

    if (!Number.isFinite(Number(player.maxEnergy)) || Number(player.maxEnergy) <= 0) {
        player.maxEnergy = expectedMaxEnergy;
    } else {
        player.maxEnergy = Number(player.maxEnergy);
    }

    if (player.maxEnergy !== expectedMaxEnergy) {
        player.maxEnergy = expectedMaxEnergy;
    }

    if (!Number.isFinite(Number(player.energy))) {
        player.energy = player.maxEnergy;
    } else {
        player.energy = Math.max(0, Math.min(player.maxEnergy, Number(player.energy)));
    }

    if (!player.lastEnergyUpdate) {
        player.lastEnergyUpdate = new Date();
    } else {
        player.lastEnergyUpdate = new Date(toTimestamp(player.lastEnergyUpdate));
    }

    return player;
}

/*
=================================
INTERVALO DE REGENERAÇÃO
=================================
*/

function getRegenInterval(player) {
    ensureEnergyFields(player);

    const minutes = player.vip
        ? BALANCE.energy.vipRegenMinutes
        : BALANCE.energy.baseRegenMinutes;

    return minutes * 60 * 1000;
}

/*
=================================
SINCRONIZA CAPACIDADE DE ENERGIA
=================================
*/

function syncEnergyCapacity(player, options = {}) {
    ensureEnergyFields(player);

    const expectedMaxEnergy = getExpectedMaxEnergy(player);
    const oldMaxEnergy = Number(player.maxEnergy) || expectedMaxEnergy;

    if (oldMaxEnergy === expectedMaxEnergy) {
        player.maxEnergy = expectedMaxEnergy;
        player.energy = Math.max(0, Math.min(player.energy, player.maxEnergy));
        return player;
    }

    player.maxEnergy = expectedMaxEnergy;

    if (options.preserveRatio && oldMaxEnergy > 0) {
        const ratio = (player.energy || 0) / oldMaxEnergy;
        player.energy = Math.round(player.maxEnergy * ratio);
    }

    player.energy = Math.max(0, Math.min(player.energy, player.maxEnergy));
    return player;
}

/*
=================================
ATUALIZA ENERGIA (PASSIVA)
=================================
*/

function updateEnergy(player) {
    ensureEnergyFields(player);
    syncEnergyCapacity(player);

    const now = Date.now();
    const interval = getRegenInterval(player);
    const lastUpdate = toTimestamp(player.lastEnergyUpdate, now);

    if (player.energy >= player.maxEnergy) {
        player.energy = player.maxEnergy;
        player.lastEnergyUpdate = new Date(now);
        return false;
    }

    const elapsed = now - lastUpdate;
    if (elapsed < interval) {
        return false;
    }

    const amount = Math.floor(elapsed / interval);
    if (amount <= 0) {
        return false;
    }

    player.energy = Math.min(player.maxEnergy, player.energy + amount);

    const consumedTime = lastUpdate + (amount * interval);
    player.lastEnergyUpdate = new Date(consumedTime);

    if (player.energy >= player.maxEnergy) {
        player.energy = player.maxEnergy;
        player.lastEnergyUpdate = new Date(now);
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
    syncEnergyCapacity(player);
    updateEnergy(player);

    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (value <= 0) return false;

    if (player.energy < value) {
        return false;
    }

    const wasFull = player.energy >= player.maxEnergy;

    player.energy = Math.max(0, player.energy - value);

    if (wasFull) {
        player.lastEnergyUpdate = new Date();
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
    syncEnergyCapacity(player);
    updateEnergy(player);

    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (value <= 0) return player;

    player.energy = Math.min(player.maxEnergy, player.energy + value);

    if (player.energy >= player.maxEnergy) {
        player.lastEnergyUpdate = new Date();
    }

    return player;
}

function restoreFullEnergy(player) {
    ensureEnergyFields(player);
    syncEnergyCapacity(player);

    player.energy = player.maxEnergy;
    player.lastEnergyUpdate = new Date();

    return player;
}

/*
=================================
TEMPO ATÉ PRÓXIMA ENERGIA
=================================
*/

function getTimeToNextEnergy(player) {
    ensureEnergyFields(player);
    syncEnergyCapacity(player);
    updateEnergy(player);

    if (player.energy >= player.maxEnergy) {
        return 0;
    }

    const interval = getRegenInterval(player);
    const elapsed = Date.now() - toTimestamp(player.lastEnergyUpdate);

    return Math.max(0, interval - elapsed);
}

/*
=================================
TEMPO ATÉ ENERGIA CHEIA
=================================
*/

function getTimeToFullEnergy(player) {
    ensureEnergyFields(player);
    syncEnergyCapacity(player);
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
    const safeMs = Math.max(0, Number(ms) || 0);
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

module.exports = {
    ensureEnergyFields,
    syncEnergyCapacity,
    updateEnergy,
    consumeEnergy,
    restoreEnergy,
    restoreFullEnergy,
    getTimeToNextEnergy,
    getTimeToFullEnergy,
    getRegenInterval,
    formatEnergyTime
};