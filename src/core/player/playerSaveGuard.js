function deepClone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function preserveTransientStates(existing, incoming) {
    const result = deepClone(incoming) || {};

    if (existing?.activeFight && !result.activeFight) {
        result.activeFight = deepClone(existing.activeFight);
    }

    if (existing?.activeArenaBattle && !result.activeArenaBattle) {
        result.activeArenaBattle = deepClone(existing.activeArenaBattle);
    }

    return result;
}

function sanitizeNumericField(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function sanitizePlayerForPersistence(player) {
    const safe = deepClone(player) || {};

    safe.gold = sanitizeNumericField(safe.gold, 0, 0);
    safe.nox = sanitizeNumericField(safe.nox, 0, 0);
    safe.glorias = sanitizeNumericField(safe.glorias, 0, 0);
    safe.keys = sanitizeNumericField(safe.keys, 0, 0);

    safe.level = sanitizeNumericField(safe.level, 1, 1);
    safe.xp = sanitizeNumericField(safe.xp, 0, 0);

    safe.maxHp = sanitizeNumericField(safe.maxHp, 1, 1);
    safe.hp = sanitizeNumericField(safe.hp, safe.maxHp || 1, 1, safe.maxHp || 1);

    safe.maxEnergy = sanitizeNumericField(safe.maxEnergy, 20, 0);
    safe.energy = sanitizeNumericField(safe.energy, safe.maxEnergy || 0, 0, safe.maxEnergy || 0);

    safe.atk = sanitizeNumericField(safe.atk, 1, 1);
    safe.def = sanitizeNumericField(safe.def, 0, 0);
    safe.crit = sanitizeNumericField(safe.crit, 0, 0, 75);

    if (!Array.isArray(safe.inventory)) safe.inventory = [];
    if (!Array.isArray(safe.soulsInventory)) safe.soulsInventory = [];
    if (!Array.isArray(safe.soulsEquipped)) safe.soulsEquipped = [null, null];
    if (!Array.isArray(safe.buffs)) safe.buffs = [];
    if (!Array.isArray(safe.cosmetics)) safe.cosmetics = [];

    if (!isObject(safe.equipment)) safe.equipment = {};
    if (!isObject(safe.consumables)) {
        safe.consumables = {
            potionHp: 0,
            potionEnergy: 0,
            tonicStrength: 0,
            tonicDefense: 0
        };
    }

    if (!isObject(safe.activeCosmetics)) {
        safe.activeCosmetics = {
            title: null,
            aura: null,
            badge: null
        };
    }

    if (!isObject(safe.achievements)) safe.achievements = {};

    if (safe.activeFight && !isObject(safe.activeFight)) {
        safe.activeFight = null;
    }

    if (safe.activeArenaBattle && !isObject(safe.activeArenaBattle)) {
        safe.activeArenaBattle = null;
    }

    return safe;
}

module.exports = {
    deepClone,
    preserveTransientStates,
    sanitizePlayerForPersistence
};