const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDefaultCounters,
    buildRarityIncrements,
    getRarityCounterName,
    getSourceRarityCounterName,
    normalizeCounters,
    buildMetricsSummary
} = require('../src/core/metrics/metricsService');

test('default counters include source split economy fields', () => {
    const counters = buildDefaultCounters();

    assert.equal(counters.fieldItemsDropped, 0);
    assert.equal(counters.dungeonItemsDropped, 0);
    assert.equal(counters.dungeonEliteItemsDropped, 0);
    assert.equal(counters.dungeonCompletionItems, 0);
    assert.equal(counters.dungeonCommonCompletionItems, 0);
    assert.equal(counters.dungeonEliteCompletionItems, 0);
    assert.equal(counters.keysSpent, 0);
    assert.equal(counters.dungeonKeysSpent, 0);
    assert.equal(counters.dungeonEliteKeysSpent, 0);
    assert.equal(counters.fieldGoldAwarded, 0);
    assert.equal(counters.dungeonGoldAwarded, 0);
    assert.equal(counters.dungeonEliteGoldAwarded, 0);
});

test('rarity counter names support global and source-specific counters', () => {
    assert.equal(getRarityCounterName('Epico'), 'itemRarityEpico');
    assert.equal(getRarityCounterName('Mitico'), 'itemRarityMitico');
    assert.equal(getSourceRarityCounterName('Epico', 'field'), 'fieldItemRarityEpico');
    assert.equal(getSourceRarityCounterName('Lendario', 'dungeon'), 'dungeonItemRarityLendario');
    assert.equal(getSourceRarityCounterName('Mitico', 'dungeon_elite'), 'dungeonEliteItemRarityMitico');
});

test('rarity increments include source counters when source is provided', () => {
    const increments = buildRarityIncrements(['Raro', 'Raro', 'Mitico'], 'dungeon_elite');

    assert.equal(increments.itemRarityRaro, 2);
    assert.equal(increments.itemRarityMitico, 1);
    assert.equal(increments.dungeonEliteItemRarityRaro, 2);
    assert.equal(increments.dungeonEliteItemRarityMitico, 1);
});

test('normalizeCounters fills missing new counters with zero', () => {
    const normalized = normalizeCounters({
        counters: {
            combatsWon: 10,
            itemsDropped: 3,
            goldAwarded: 120
        }
    });

    assert.equal(normalized.combatsWon, 10);
    assert.equal(normalized.itemsDropped, 3);
    assert.equal(normalized.goldAwarded, 120);
    assert.equal(normalized.fieldItemsDropped, 0);
    assert.equal(normalized.dungeonItemsDropped, 0);
    assert.equal(normalized.dungeonEliteItemsDropped, 0);
    assert.equal(normalized.dungeonCommonCompletionItems, 0);
    assert.equal(normalized.dungeonEliteCompletionItems, 0);
    assert.equal(normalized.keysSpent, 0);
});

test('metrics summary exposes dungeon rates, completion item rates, audit and key net', () => {
    const summary = buildMetricsSummary({
        dateKey: '2026-04-30',
        counters: {
            combatsWon: 20,
            combatsLost: 5,
            dungeonsStarted: 4,
            dungeonsCompleted: 3,
            dungeonsAbandoned: 1,
            dungeonEliteStarted: 1,
            dungeonEliteCompleted: 1,
            dungeonCommonCompletionItems: 2,
            dungeonEliteCompletionItems: 1,
            keysDropped: 5,
            keysSpent: 4,
            dungeonGoldAwarded: 500,
            dungeonXpAwarded: 400,
            dungeonEliteGoldAwarded: 100,
            dungeonEliteXpAwarded: 100,
            dungeonItemRarityRaro: 2,
            dungeonEliteItemRarityMitico: 1
        }
    });

    assert.equal(summary.derived.winRate, '80.0');
    assert.equal(summary.derived.dungeonFinishRate, '75.0');
    assert.equal(summary.derived.dungeonAbandonRate, '25.0');
    assert.equal(summary.derived.dungeonEliteFinishRate, '100.0');
    assert.equal(summary.derived.commonDungeonCompleted, 2);
    assert.equal(summary.derived.keyNet, 1);
    assert.equal(summary.derived.avgDungeonGoldPerCompletion, 200);
    assert.equal(summary.derived.avgDungeonXpPerCompletion, 167);
    assert.equal(summary.derived.avgCommonDungeonGoldPerCompletion, 250);
    assert.equal(summary.derived.avgCommonDungeonXpPerCompletion, 200);
    assert.equal(summary.derived.avgEliteDungeonGoldPerCompletion, 100);
    assert.equal(summary.derived.avgEliteDungeonXpPerCompletion, 100);
    assert.equal(summary.derived.commonCompletionItemRate, '100.0');
    assert.equal(summary.derived.eliteCompletionItemRate, '100.0');
    assert.equal(summary.sourceRarity.dungeon.raro, 2);
    assert.equal(summary.sourceRarity.dungeonElite.mitico, 1);
    assert.ok(summary.dungeonAudit);
});
