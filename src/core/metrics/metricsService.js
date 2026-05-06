const MetricsDaily = require('./MetricsModel');
const { buildDungeonRewardAudit } = require('../dungeon/dungeonRewardAudit');

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

const SOURCE_PREFIX = {
    field: 'field',
    dungeon: 'dungeon',
    dungeon_elite: 'dungeonElite'
};

const DUNGEON_ROOM_TYPE_COUNTERS = {
    combat: 'dungeonCombatRoomsCleared',
    elite: 'dungeonEliteRoomsCleared',
    boss: 'dungeonBossRoomsCleared',
    treasure: 'dungeonTreasureRoomsCleared',
    heal: 'dungeonHealRoomsCleared',
    curse: 'dungeonCurseRoomsCleared',
    shrine: 'dungeonShrineRoomsCleared'
};

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

function getMetricsReadyState() {
    return Number(
        MetricsDaily?.db?.readyState ??
        MetricsDaily?.base?.connection?.readyState ??
        0
    );
}

function shouldPersistMetrics() {
    if (process.env.NOCTRA_DISABLE_METRICS === '1') return false;
    if (process.env.NODE_ENV === 'test') return false;
    return getMetricsReadyState() === 1;
}

function buildFallbackMetrics(dateKeyInput) {
    return {
        dateKey: sanitizeDateKey(dateKeyInput),
        counters: buildDefaultCounters(),
        persistence: 'skipped'
    };
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

function getSourcePrefix(source = 'field') {
    return SOURCE_PREFIX[source] || SOURCE_PREFIX.field;
}

function getSourceItemCounter(source = 'field') {
    const prefix = getSourcePrefix(source);
    if (prefix === 'field') return 'fieldItemsDropped';
    if (prefix === 'dungeon') return 'dungeonItemsDropped';
    if (prefix === 'dungeonElite') return 'dungeonEliteItemsDropped';
    return 'fieldItemsDropped';
}

function getSourceSoulCounter(source = 'field') {
    const prefix = getSourcePrefix(source);
    if (prefix === 'field') return 'fieldSoulsDropped';
    if (prefix === 'dungeon') return 'dungeonSoulsDropped';
    if (prefix === 'dungeonElite') return 'dungeonEliteSoulsDropped';
    return 'fieldSoulsDropped';
}

function getSourceKeyCounter(source = 'field') {
    const prefix = getSourcePrefix(source);
    if (prefix === 'field') return 'fieldKeysDropped';
    if (prefix === 'dungeon') return 'dungeonKeysDropped';
    if (prefix === 'dungeonElite') return 'dungeonEliteKeysDropped';
    return 'fieldKeysDropped';
}

function getSourceGoldCounter(source = 'field') {
    const prefix = getSourcePrefix(source);
    if (prefix === 'field') return 'fieldGoldAwarded';
    if (prefix === 'dungeon') return 'dungeonGoldAwarded';
    if (prefix === 'dungeonElite') return 'dungeonEliteGoldAwarded';
    return 'fieldGoldAwarded';
}

function getSourceXpCounter(source = 'field') {
    const prefix = getSourcePrefix(source);
    if (prefix === 'field') return 'fieldXpAwarded';
    if (prefix === 'dungeon') return 'dungeonXpAwarded';
    if (prefix === 'dungeonElite') return 'dungeonEliteXpAwarded';
    return 'fieldXpAwarded';
}

function getSourceRarityCounterName(rarity, source = 'field') {
    const base = getRarityCounterName(rarity);
    const prefix = getSourcePrefix(source);

    if (prefix === 'field') {
        return `field${base.charAt(0).toUpperCase()}${base.slice(1)}`;
    }

    if (prefix === 'dungeon') {
        return `dungeon${base.charAt(0).toUpperCase()}${base.slice(1)}`;
    }

    if (prefix === 'dungeonElite') {
        return `dungeonElite${base.charAt(0).toUpperCase()}${base.slice(1)}`;
    }

    return base;
}

function normalizeDungeonRoomType(roomType) {
    return String(roomType || '').trim().toLowerCase();
}

function hasKnownDungeonRoomType(roomType) {
    return Boolean(DUNGEON_ROOM_TYPE_COUNTERS[normalizeDungeonRoomType(roomType)]);
}

function getDungeonRoomTypeCounter(roomType) {
    const key = normalizeDungeonRoomType(roomType);
    return DUNGEON_ROOM_TYPE_COUNTERS[key] || 'dungeonOtherRoomsCleared';
}

function buildRarityIncrements(rarities = [], source = null) {
    const increments = {};

    if (!Array.isArray(rarities)) {
        return increments;
    }

    for (const rarity of rarities) {
        const counter = getRarityCounterName(rarity);
        increments[counter] = (increments[counter] || 0) + 1;

        if (source) {
            const sourceCounter = getSourceRarityCounterName(rarity, source);
            increments[sourceCounter] = (increments[sourceCounter] || 0) + 1;
        }
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
        dungeonCombatRoomsCleared: 0,
        dungeonEliteRoomsCleared: 0,
        dungeonBossRoomsCleared: 0,
        dungeonTreasureRoomsCleared: 0,
        dungeonHealRoomsCleared: 0,
        dungeonCurseRoomsCleared: 0,
        dungeonShrineRoomsCleared: 0,
        dungeonOtherRoomsCleared: 0,
        dungeonEliteStarted: 0,
        dungeonEliteCompleted: 0,
        dungeonEliteAbandoned: 0,

        itemsDropped: 0,
        fieldItemsDropped: 0,
        dungeonItemsDropped: 0,
        dungeonEliteItemsDropped: 0,
        dungeonCompletionItems: 0,
        dungeonCommonCompletionItems: 0,
        dungeonEliteCompletionItems: 0,

        itemRarityComum: 0,
        itemRarityIncomum: 0,
        itemRarityRaro: 0,
        itemRarityEpico: 0,
        itemRarityLendario: 0,
        itemRarityMitico: 0,
        itemRarityUnknown: 0,

        fieldItemRarityComum: 0,
        fieldItemRarityIncomum: 0,
        fieldItemRarityRaro: 0,
        fieldItemRarityEpico: 0,
        fieldItemRarityLendario: 0,
        fieldItemRarityMitico: 0,
        fieldItemRarityUnknown: 0,

        dungeonItemRarityComum: 0,
        dungeonItemRarityIncomum: 0,
        dungeonItemRarityRaro: 0,
        dungeonItemRarityEpico: 0,
        dungeonItemRarityLendario: 0,
        dungeonItemRarityMitico: 0,
        dungeonItemRarityUnknown: 0,

        dungeonEliteItemRarityComum: 0,
        dungeonEliteItemRarityIncomum: 0,
        dungeonEliteItemRarityRaro: 0,
        dungeonEliteItemRarityEpico: 0,
        dungeonEliteItemRarityLendario: 0,
        dungeonEliteItemRarityMitico: 0,
        dungeonEliteItemRarityUnknown: 0,

        soulsDropped: 0,
        fieldSoulsDropped: 0,
        dungeonSoulsDropped: 0,
        dungeonEliteSoulsDropped: 0,

        keysDropped: 0,
        fieldKeysDropped: 0,
        dungeonKeysDropped: 0,
        dungeonEliteKeysDropped: 0,
        keysSpent: 0,
        dungeonKeysSpent: 0,
        dungeonEliteKeysSpent: 0,

        consumablesUsed: 0,

        goldAwarded: 0,
        fieldGoldAwarded: 0,
        dungeonGoldAwarded: 0,
        dungeonEliteGoldAwarded: 0,

        xpAwarded: 0,
        fieldXpAwarded: 0,
        dungeonXpAwarded: 0,
        dungeonEliteXpAwarded: 0,

        gloriasAwarded: 0,
        dungeonGloriasAwarded: 0,
        dungeonEliteGloriasAwarded: 0,

        goldSpent: 0,
        noxSpent: 0,
        gloriasSpent: 0,
        itemsSold: 0,
        goldFromSales: 0,
        vipPurchases: 0
    };
}

async function ensureDailyMetrics(dateKeyInput) {
    const dateKey = sanitizeDateKey(dateKeyInput);

    if (!shouldPersistMetrics()) {
        return null;
    }

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

    if (!shouldPersistMetrics()) {
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

    if (!shouldPersistMetrics()) {
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

async function recordDungeonStarted(options = {}) {
    const isElite = Boolean(options.isEliteDungeon || options.mode === 'elite' || options.difficulty === 'elite');

    return addManyMetrics({
        dungeonsStarted: 1,
        dungeonEliteStarted: isElite ? 1 : 0,
        keysSpent: Number(options.keysSpent || 0),
        dungeonKeysSpent: isElite ? 0 : Number(options.keysSpent || 0),
        dungeonEliteKeysSpent: isElite ? Number(options.keysSpent || 0) : 0
    });
}

async function recordDungeonCompleted(options = {}) {
    const isElite = Boolean(options.isEliteDungeon || options.mode === 'elite' || options.difficulty === 'elite');
    const completionItems = Math.max(0, Number(options.completionItems ?? 0));

    return addManyMetrics({
        dungeonsCompleted: 1,
        dungeonEliteCompleted: isElite ? 1 : 0,
        dungeonCompletionItems: completionItems,
        dungeonCommonCompletionItems: isElite ? 0 : completionItems,
        dungeonEliteCompletionItems: isElite ? completionItems : 0
    });
}

async function recordDungeonAbandoned(options = {}) {
    const isElite = Boolean(options.isEliteDungeon || options.mode === 'elite' || options.difficulty === 'elite');

    return addManyMetrics({
        dungeonsAbandoned: 1,
        dungeonEliteAbandoned: isElite ? 1 : 0
    });
}

async function recordDungeonRoomCleared(amountOrOptions = 1, maybeOptions = {}) {
    const amount = typeof amountOrOptions === 'object'
        ? Number(amountOrOptions.amount || 1)
        : Number(amountOrOptions || 1);

    const options = typeof amountOrOptions === 'object'
        ? amountOrOptions
        : maybeOptions;

    const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
    const rawRoomType = options.roomType || options.type;
    const increments = {
        dungeonRoomsCleared: safeAmount
    };

    if (hasKnownDungeonRoomType(rawRoomType)) {
        increments[getDungeonRoomTypeCounter(rawRoomType)] = safeAmount;
    } else if (rawRoomType) {
        increments.dungeonOtherRoomsCleared = safeAmount;
    }

    return addManyMetrics(increments);
}

async function recordDropMetrics({
    items = 0,
    itemRarities = [],
    souls = 0,
    keys = 0,
    gold = 0,
    xp = 0,
    source = 'field'
} = {}) {
    return addManyMetrics({
        itemsDropped: items,
        [getSourceItemCounter(source)]: items,
        ...buildRarityIncrements(itemRarities, source),
        soulsDropped: souls,
        [getSourceSoulCounter(source)]: souls,
        keysDropped: keys,
        [getSourceKeyCounter(source)]: keys,
        goldAwarded: gold,
        [getSourceGoldCounter(source)]: gold,
        xpAwarded: xp,
        [getSourceXpCounter(source)]: xp
    });
}

async function recordDungeonRewardMetrics({
    items = 0,
    itemRarities = [],
    souls = 0,
    keys = 0,
    gold = 0,
    xp = 0,
    glorias = 0,
    completionItems = 0,
    isEliteDungeon = false
} = {}) {
    const source = isEliteDungeon ? 'dungeon_elite' : 'dungeon';
    const completionCount = Number(completionItems || 0);

    return addManyMetrics({
        itemsDropped: items,
        [getSourceItemCounter(source)]: items,
        dungeonCompletionItems: completionCount,
        dungeonCommonCompletionItems: isEliteDungeon ? 0 : completionCount,
        dungeonEliteCompletionItems: isEliteDungeon ? completionCount : 0,
        ...buildRarityIncrements(itemRarities, source),
        soulsDropped: souls,
        [getSourceSoulCounter(source)]: souls,
        keysDropped: keys,
        [getSourceKeyCounter(source)]: keys,
        goldAwarded: gold,
        [getSourceGoldCounter(source)]: gold,
        xpAwarded: xp,
        [getSourceXpCounter(source)]: xp,
        gloriasAwarded: glorias,
        dungeonGloriasAwarded: isEliteDungeon ? 0 : glorias,
        dungeonEliteGloriasAwarded: isEliteDungeon ? glorias : 0
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

async function getTodayMetrics() {
    if (!shouldPersistMetrics()) {
        return buildFallbackMetrics(getDateKey());
    }

    const result = await ensureDailyMetrics(getDateKey());
    return result || buildFallbackMetrics(getDateKey());
}

async function getMetricsByDate(dateKeyInput) {
    const dateKey = sanitizeDateKey(dateKeyInput);

    if (!shouldPersistMetrics()) {
        return buildFallbackMetrics(dateKey);
    }

    const result = await ensureDailyMetrics(dateKey);

    return result || buildFallbackMetrics(dateKey);
}

function readCounter(counters, name) {
    return Number(counters?.[name] || 0);
}

function normalizeCounters(doc) {
    const counters = doc?.counters || {};
    const defaults = buildDefaultCounters();

    return Object.fromEntries(
        Object.keys(defaults).map(key => [key, readCounter(counters, key)])
    );
}

function buildRaritySummary(counters, prefix = '') {
    const prefixName = prefix ? `${prefix}ItemRarity` : 'itemRarity';

    const summary = {
        comum: readCounter(counters, `${prefixName}Comum`),
        incomum: readCounter(counters, `${prefixName}Incomum`),
        raro: readCounter(counters, `${prefixName}Raro`),
        epico: readCounter(counters, `${prefixName}Epico`),
        lendario: readCounter(counters, `${prefixName}Lendario`),
        mitico: readCounter(counters, `${prefixName}Mitico`),
        unknown: readCounter(counters, `${prefixName}Unknown`)
    };

    summary.totalKnown = summary.comum + summary.incomum + summary.raro + summary.epico + summary.lendario + summary.mitico;
    summary.totalTracked = summary.totalKnown + summary.unknown;

    return summary;
}

function percent(part, total) {
    const p = Number(part || 0);
    const t = Number(total || 0);

    if (t <= 0) return '0.0';

    return ((p / t) * 100).toFixed(1);
}

function averagePer(numerator, denominator) {
    const n = Number(numerator || 0);
    const d = Number(denominator || 0);

    if (d <= 0) return 0;

    return Math.round(n / d);
}

function buildMetricsSummary(doc) {
    const dateKey = doc?.dateKey || getDateKey();
    const c = normalizeCounters(doc);

    const totalCombatOutcomes = c.combatsWon + c.combatsLost + c.combatsFled;
    const commonDungeonCompleted = Math.max(0, c.dungeonsCompleted - c.dungeonEliteCompleted);

    const dungeonCombatLikeRoomsCleared = c.dungeonCombatRoomsCleared + c.dungeonEliteRoomsCleared + c.dungeonBossRoomsCleared;
    const dungeonEventRoomsCleared = c.dungeonTreasureRoomsCleared + c.dungeonHealRoomsCleared + c.dungeonCurseRoomsCleared + c.dungeonShrineRoomsCleared;
    const dungeonClassifiedRoomsCleared = dungeonCombatLikeRoomsCleared + dungeonEventRoomsCleared + c.dungeonOtherRoomsCleared;
    const dungeonUnclassifiedRoomsCleared = Math.max(0, c.dungeonRoomsCleared - dungeonClassifiedRoomsCleared);

    const summary = {
        dateKey,
        counters: c,
        rarity: buildRaritySummary(c),
        sourceRarity: {
            field: buildRaritySummary(c, 'field'),
            dungeon: buildRaritySummary(c, 'dungeon'),
            dungeonElite: buildRaritySummary(c, 'dungeonElite')
        },
        derived: {
            totalCombatOutcomes,
            commonDungeonCompleted,
            dungeonCombatLikeRoomsCleared,
            dungeonEventRoomsCleared,
            dungeonClassifiedRoomsCleared,
            dungeonUnclassifiedRoomsCleared,
            dungeonCombatRoomRate: percent(dungeonCombatLikeRoomsCleared, c.dungeonRoomsCleared),
            dungeonEventRoomRate: percent(dungeonEventRoomsCleared, c.dungeonRoomsCleared),
            dungeonClassifiedRoomRate: percent(dungeonClassifiedRoomsCleared, c.dungeonRoomsCleared),
            dungeonUnclassifiedRoomRate: percent(dungeonUnclassifiedRoomsCleared, c.dungeonRoomsCleared),
            winRate: percent(c.combatsWon, totalCombatOutcomes),
            dungeonFinishRate: percent(c.dungeonsCompleted, c.dungeonsStarted),
            dungeonAbandonRate: percent(c.dungeonsAbandoned, c.dungeonsStarted),
            dungeonEliteFinishRate: percent(c.dungeonEliteCompleted, c.dungeonEliteStarted),
            avgGoldPerCombat: averagePer(c.goldAwarded, c.combatsWon),
            avgXpPerCombat: averagePer(c.xpAwarded, c.combatsWon),
            avgFieldGoldPerWin: averagePer(c.fieldGoldAwarded, c.combatsWon),
            avgFieldXpPerWin: averagePer(c.fieldXpAwarded, c.combatsWon),
            avgDungeonGoldPerCompletion: averagePer(c.dungeonGoldAwarded + c.dungeonEliteGoldAwarded, c.dungeonsCompleted),
            avgDungeonXpPerCompletion: averagePer(c.dungeonXpAwarded + c.dungeonEliteXpAwarded, c.dungeonsCompleted),
            avgCommonDungeonGoldPerCompletion: averagePer(c.dungeonGoldAwarded, commonDungeonCompleted),
            avgCommonDungeonXpPerCompletion: averagePer(c.dungeonXpAwarded, commonDungeonCompleted),
            avgEliteDungeonGoldPerCompletion: averagePer(c.dungeonEliteGoldAwarded, c.dungeonEliteCompleted),
            avgEliteDungeonXpPerCompletion: averagePer(c.dungeonEliteXpAwarded, c.dungeonEliteCompleted),
            itemDropRatePerWin: percent(c.itemsDropped, c.combatsWon),
            soulDropRatePerWin: percent(c.soulsDropped, c.combatsWon),
            keyDropRatePerWin: percent(c.keysDropped, c.combatsWon),
            commonCompletionItemRate: percent(c.dungeonCommonCompletionItems, commonDungeonCompleted),
            eliteCompletionItemRate: percent(c.dungeonEliteCompletionItems, c.dungeonEliteCompleted),
            keyNet: c.keysDropped - c.keysSpent
        }
    };

    summary.dungeonAudit = buildDungeonRewardAudit(summary);

    return summary;
}

module.exports = {
    SOURCE_PREFIX,
    DUNGEON_ROOM_TYPE_COUNTERS,
    getDateKey,
    sanitizeDateKey,
    getMetricsReadyState,
    shouldPersistMetrics,
    buildFallbackMetrics,
    normalizeRarityName,
    getRarityCounterName,
    getSourcePrefix,
    getSourceRarityCounterName,
    normalizeDungeonRoomType,
    hasKnownDungeonRoomType,
    getDungeonRoomTypeCounter,
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
    recordDungeonRewardMetrics,
    recordConsumableUsed,
    recordPurchaseMetrics,
    recordSaleMetrics,

    getTodayMetrics,
    getMetricsByDate,
    normalizeCounters,
    buildRaritySummary,
    buildMetricsSummary
};
