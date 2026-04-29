const MetricsDaily = require('./MetricsModel');

const RARITY_TO_COUNTER = {
    comum: 'itemRarityComum',
    incomum: 'itemRarityIncomum',
    raro: 'itemRarityRaro',
    epico: 'itemRarityEpico',
    épico: 'itemRarityEpico',
    lendario: 'itemRarityLendario',
    lendário: 'itemRarityLendario',
    mitico: 'itemRarityMitico',
    mítico: 'itemRarityMitico'
};

/*
=================================
DATE KEY
=================================
*/

function getDateKey(date = new Date()) {
    const safeDate = date instanceof Date ? date : new Date();
    const year = safeDate.getUTCFullYear();
    const month = String(safeDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function sanitizeDateKey(dateKey) {
    if (typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey.trim())) {
        return dateKey.trim();
    }

    return getDateKey();
}

function normalizeRarityName(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function getRarityCounterName(rarity) {
    const key = normalizeRarityName(rarity);
    return RARITY_TO_COUNTER[key] || 'itemRarityUnknown';
}

function buildRarityIncrements(rarities = []) {
    const increments = {};

    if (!Array.isArray(rarities)) {
        return increments;
    }

    for (const rarity of rarities) {
        const counter = getRarityCounterName(rarity);
        increments[counter] = (increments[counter] || 0) + 1;
    }

    return increments;
}

function buildDefaultCounters() {
    return {
        playersCreated: 0,
        menuLoads: 0,

        combatsStarted: 0,
        combatsWon: 0,
        combatsLost: 0,
        combatsFled: 0,

        dungeonsStarted: 0,
        dungeonsCompleted: 0,
        dungeonsAbandoned: 0,
        dungeonRoomsCleared: 0,

        itemsDropped: 0,
        itemRarityComum: 0,
        itemRarityIncomum: 0,
        itemRarityRaro: 0,
        itemRarityEpico: 0,
        itemRarityLendario: 0,
        itemRarityMitico: 0,
        itemRarityUnknown: 0,

        soulsDropped: 0,
        keysDropped: 0,

        consumablesUsed: 0,

        goldAwarded: 0,
        xpAwarded: 0,

        goldSpent: 0,
        noxSpent: 0,
        gloriasSpent: 0,
        itemsSold: 0,
        goldFromSales: 0,
        vipPurchases: 0
    };
}

/*
=================================
SAFE CORE OPS
=================================
*/

async function ensureDailyMetrics(dateKeyInput) {
    const dateKey = sanitizeDateKey(dateKeyInput);

    try {
        return await MetricsDaily.findOneAndUpdate(
            { dateKey },
            {
                $setOnInsert: {
                    dateKey,
                    counters: buildDefaultCounters()
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: false
            }
        );
    } catch (error) {
        console.error('⚠️ ensureDailyMetrics falhou:', error);
        return null;
    }
}

async function incrementMetric(metricName, amount = 1, dateKeyInput) {
    if (!metricName) return null;

    const dateKey = sanitizeDateKey(dateKeyInput);
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
        return null;
    }

    try {
        await ensureDailyMetrics(dateKey);

        return await MetricsDaily.findOneAndUpdate(
            { dateKey },
            {
                $inc: {
                    [`counters.${metricName}`]: numericAmount
                }
            },
            {
                new: true,
                runValidators: false
            }
        );
    } catch (error) {
        console.error(`⚠️ incrementMetric falhou (${metricName}):`, error);
        return null;
    }
}

async function addManyMetrics(increments = {}, dateKeyInput) {
    const dateKey = sanitizeDateKey(dateKeyInput);
    const validIncrements = {};

    Object.entries(increments || {}).forEach(([key, value]) => {
        const num = Number(value);
        if (Number.isFinite(num) && num !== 0) {
            validIncrements[`counters.${key}`] = num;
        }
    });

    if (Object.keys(validIncrements).length === 0) {
        return null;
    }

    try {
        await ensureDailyMetrics(dateKey);

        return await MetricsDaily.findOneAndUpdate(
            { dateKey },
            { $inc: validIncrements },
            {
                new: true,
                runValidators: false
            }
        );
    } catch (error) {
        console.error('⚠️ addManyMetrics falhou:', error);
        return null;
    }
}

/*
=================================
RECORD HELPERS
=================================
*/

async function recordPlayerCreated() {
    return incrementMetric('playersCreated', 1);
}

async function recordMenuLoad() {
    return incrementMetric('menuLoads', 1);
}

async function recordCombatStarted() {
    return incrementMetric('combatsStarted', 1);
}

async function recordCombatResult(result) {
    if (result === 'win') return incrementMetric('combatsWon', 1);
    if (result === 'loss') return incrementMetric('combatsLost', 1);
    if (result === 'fled') return incrementMetric('combatsFled', 1);
    return null;
}

async function recordDungeonStarted() {
    return incrementMetric('dungeonsStarted', 1);
}

async function recordDungeonCompleted() {
    return incrementMetric('dungeonsCompleted', 1);
}

async function recordDungeonAbandoned() {
    return incrementMetric('dungeonsAbandoned', 1);
}

async function recordDungeonRoomCleared(amount = 1) {
    return incrementMetric('dungeonRoomsCleared', amount);
}

async function recordDropMetrics({
    items = 0,
    itemRarities = [],
    souls = 0,
    keys = 0,
    gold = 0,
    xp = 0
} = {}) {
    return addManyMetrics({
        itemsDropped: items,
        ...buildRarityIncrements(itemRarities),
        soulsDropped: souls,
        keysDropped: keys,
        goldAwarded: gold,
        xpAwarded: xp
    });
}

async function recordConsumableUsed() {
    return incrementMetric('consumablesUsed', 1);
}

async function recordPurchaseMetrics({
    currency,
    amount = 0,
    vip = false
} = {}) {
    const increments = {};

    if (currency === 'gold') increments.goldSpent = Number(amount || 0);
    if (currency === 'nox') increments.noxSpent = Number(amount || 0);
    if (currency === 'glorias') increments.gloriasSpent = Number(amount || 0);
    if (vip) increments.vipPurchases = 1;

    return addManyMetrics(increments);
}

async function recordSaleMetrics({
    gold = 0,
    items = 1
} = {}) {
    return addManyMetrics({
        goldFromSales: Number(gold || 0),
        itemsSold: Number(items || 0)
    });
}

/*
=================================
READ HELPERS
=================================
*/

async function getTodayMetrics() {
    const result = await ensureDailyMetrics(getDateKey());
    return result || {
        dateKey: getDateKey(),
        counters: buildDefaultCounters()
    };
}

async function getMetricsByDate(dateKeyInput) {
    const dateKey = sanitizeDateKey(dateKeyInput);
    const result = await ensureDailyMetrics(dateKey);

    return result || {
        dateKey,
        counters: buildDefaultCounters()
    };
}

function normalizeCounters(doc) {
    const counters = doc?.counters || {};

    return {
        playersCreated: Number(counters.playersCreated || 0),
        menuLoads: Number(counters.menuLoads || 0),

        combatsStarted: Number(counters.combatsStarted || 0),
        combatsWon: Number(counters.combatsWon || 0),
        combatsLost: Number(counters.combatsLost || 0),
        combatsFled: Number(counters.combatsFled || 0),

        dungeonsStarted: Number(counters.dungeonsStarted || 0),
        dungeonsCompleted: Number(counters.dungeonsCompleted || 0),
        dungeonsAbandoned: Number(counters.dungeonsAbandoned || 0),
        dungeonRoomsCleared: Number(counters.dungeonRoomsCleared || 0),

        itemsDropped: Number(counters.itemsDropped || 0),
        itemRarityComum: Number(counters.itemRarityComum || 0),
        itemRarityIncomum: Number(counters.itemRarityIncomum || 0),
        itemRarityRaro: Number(counters.itemRarityRaro || 0),
        itemRarityEpico: Number(counters.itemRarityEpico || 0),
        itemRarityLendario: Number(counters.itemRarityLendario || 0),
        itemRarityMitico: Number(counters.itemRarityMitico || 0),
        itemRarityUnknown: Number(counters.itemRarityUnknown || 0),

        soulsDropped: Number(counters.soulsDropped || 0),
        keysDropped: Number(counters.keysDropped || 0),

        consumablesUsed: Number(counters.consumablesUsed || 0),

        goldAwarded: Number(counters.goldAwarded || 0),
        xpAwarded: Number(counters.xpAwarded || 0),

        goldSpent: Number(counters.goldSpent || 0),
        noxSpent: Number(counters.noxSpent || 0),
        gloriasSpent: Number(counters.gloriasSpent || 0),
        itemsSold: Number(counters.itemsSold || 0),
        goldFromSales: Number(counters.goldFromSales || 0),
        vipPurchases: Number(counters.vipPurchases || 0)
    };
}

function buildRaritySummary(counters) {
    const totalKnown =
        counters.itemRarityComum +
        counters.itemRarityIncomum +
        counters.itemRarityRaro +
        counters.itemRarityEpico +
        counters.itemRarityLendario +
        counters.itemRarityMitico;

    const totalTracked = totalKnown + counters.itemRarityUnknown;

    return {
        comum: counters.itemRarityComum,
        incomum: counters.itemRarityIncomum,
        raro: counters.itemRarityRaro,
        epico: counters.itemRarityEpico,
        lendario: counters.itemRarityLendario,
        mitico: counters.itemRarityMitico,
        unknown: counters.itemRarityUnknown,
        totalKnown,
        totalTracked
    };
}

function buildMetricsSummary(doc) {
    const dateKey = doc?.dateKey || getDateKey();
    const c = normalizeCounters(doc);

    const totalCombatOutcomes = c.combatsWon + c.combatsLost + c.combatsFled;

    const winRate = totalCombatOutcomes > 0
        ? ((c.combatsWon / totalCombatOutcomes) * 100).toFixed(1)
        : '0.0';

    const dungeonFinishRate = c.dungeonsStarted > 0
        ? ((c.dungeonsCompleted / c.dungeonsStarted) * 100).toFixed(1)
        : '0.0';

    const avgGoldPerCombat = c.combatsWon > 0
        ? Math.round(c.goldAwarded / c.combatsWon)
        : 0;

    const avgXpPerCombat = c.combatsWon > 0
        ? Math.round(c.xpAwarded / c.combatsWon)
        : 0;

    return {
        dateKey,
        counters: c,
        rarity: buildRaritySummary(c),
        derived: {
            totalCombatOutcomes,
            winRate,
            dungeonFinishRate,
            avgGoldPerCombat,
            avgXpPerCombat
        }
    };
}

module.exports = {
    getDateKey,
    sanitizeDateKey,
    normalizeRarityName,
    getRarityCounterName,
    buildRarityIncrements,
    buildDefaultCounters,
    ensureDailyMetrics,
    incrementMetric,
    addManyMetrics,

    recordPlayerCreated,
    recordMenuLoad,
    recordCombatStarted,
    recordCombatResult,

    recordDungeonStarted,
    recordDungeonCompleted,
    recordDungeonAbandoned,
    recordDungeonRoomCleared,

    recordDropMetrics,
    recordConsumableUsed,
    recordPurchaseMetrics,
    recordSaleMetrics,

    getTodayMetrics,
    getMetricsByDate,
    normalizeCounters,
    buildRaritySummary,
    buildMetricsSummary
};