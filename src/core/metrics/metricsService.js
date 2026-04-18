const MetricsDaily = require('./MetricsModel');

function getDateKey(date = new Date()) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function ensureDailyMetrics(dateKey = getDateKey()) {
    let doc = await MetricsDaily.findOne({ dateKey });

    if (!doc) {
        doc = await MetricsDaily.create({ dateKey });
    }

    return doc;
}

async function incrementMetric(metricName, amount = 1, dateKey = getDateKey()) {
    if (!metricName) return null;

    await ensureDailyMetrics(dateKey);

    return MetricsDaily.findOneAndUpdate(
        { dateKey },
        { $inc: { [`counters.${metricName}`]: amount } },
        { new: true }
    );
}

async function addManyMetrics(increments = {}, dateKey = getDateKey()) {
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

    await ensureDailyMetrics(dateKey);

    return MetricsDaily.findOneAndUpdate(
        { dateKey },
        { $inc: validIncrements },
        { new: true }
    );
}

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

async function recordDropMetrics({ items = 0, souls = 0, keys = 0, gold = 0, xp = 0 } = {}) {
    return addManyMetrics({
        itemsDropped: items,
        soulsDropped: souls,
        keysDropped: keys,
        goldAwarded: gold,
        xpAwarded: xp
    });
}

async function recordConsumableUsed() {
    return incrementMetric('consumablesUsed', 1);
}

async function getTodayMetrics() {
    return ensureDailyMetrics(getDateKey());
}

async function getMetricsByDate(dateKey) {
    if (!dateKey) return null;
    return ensureDailyMetrics(dateKey);
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
        soulsDropped: Number(counters.soulsDropped || 0),
        keysDropped: Number(counters.keysDropped || 0),

        consumablesUsed: Number(counters.consumablesUsed || 0),

        goldAwarded: Number(counters.goldAwarded || 0),
        xpAwarded: Number(counters.xpAwarded || 0)
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

    getTodayMetrics,
    getMetricsByDate,
    normalizeCounters,
    buildMetricsSummary
};