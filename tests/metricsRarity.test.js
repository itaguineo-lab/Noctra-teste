const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getRarityCounterName,
    buildRarityIncrements,
    normalizeCounters,
    buildRaritySummary,
    buildMetricsSummary
} = require('../src/core/metrics/metricsService');

test('getRarityCounterName normaliza raridades com e sem acento', () => {
    assert.equal(getRarityCounterName('Comum'), 'itemRarityComum');
    assert.equal(getRarityCounterName('Incomum'), 'itemRarityIncomum');
    assert.equal(getRarityCounterName('Raro'), 'itemRarityRaro');
    assert.equal(getRarityCounterName('Épico'), 'itemRarityEpico');
    assert.equal(getRarityCounterName('Epico'), 'itemRarityEpico');
    assert.equal(getRarityCounterName('Lendário'), 'itemRarityLendario');
    assert.equal(getRarityCounterName('Lendario'), 'itemRarityLendario');
    assert.equal(getRarityCounterName('Mítico'), 'itemRarityMitico');
    assert.equal(getRarityCounterName('Mitico'), 'itemRarityMitico');
    assert.equal(getRarityCounterName('???'), 'itemRarityUnknown');
});

test('buildRarityIncrements agrega múltiplos drops por raridade', () => {
    const increments = buildRarityIncrements([
        'Comum',
        'Comum',
        'Raro',
        'Épico',
        'Epico',
        'Lendário',
        'Mítico',
        'Desconhecida'
    ]);

    assert.deepEqual(increments, {
        itemRarityComum: 2,
        itemRarityRaro: 1,
        itemRarityEpico: 2,
        itemRarityLendario: 1,
        itemRarityMitico: 1,
        itemRarityUnknown: 1
    });
});

test('normalizeCounters preserva contadores de raridade com fallback zero', () => {
    const counters = normalizeCounters({
        counters: {
            itemsDropped: 4,
            itemRarityComum: 1,
            itemRarityRaro: 2,
            itemRarityMitico: 1
        }
    });

    assert.equal(counters.itemsDropped, 4);
    assert.equal(counters.itemRarityComum, 1);
    assert.equal(counters.itemRarityIncomum, 0);
    assert.equal(counters.itemRarityRaro, 2);
    assert.equal(counters.itemRarityEpico, 0);
    assert.equal(counters.itemRarityLendario, 0);
    assert.equal(counters.itemRarityMitico, 1);
    assert.equal(counters.itemRarityUnknown, 0);
});

test('buildRaritySummary calcula totais conhecidos e rastreados', () => {
    const summary = buildRaritySummary({
        itemRarityComum: 2,
        itemRarityIncomum: 1,
        itemRarityRaro: 3,
        itemRarityEpico: 4,
        itemRarityLendario: 1,
        itemRarityMitico: 1,
        itemRarityUnknown: 2
    });

    assert.deepEqual(summary, {
        comum: 2,
        incomum: 1,
        raro: 3,
        epico: 4,
        lendario: 1,
        mitico: 1,
        unknown: 2,
        totalKnown: 12,
        totalTracked: 14
    });
});

test('buildMetricsSummary expõe bloco rarity', () => {
    const summary = buildMetricsSummary({
        dateKey: '2026-04-29',
        counters: {
            combatsWon: 2,
            goldAwarded: 100,
            xpAwarded: 80,
            itemsDropped: 2,
            itemRarityLendario: 1,
            itemRarityMitico: 1
        }
    });

    assert.equal(summary.dateKey, '2026-04-29');
    assert.equal(summary.rarity.lendario, 1);
    assert.equal(summary.rarity.mitico, 1);
    assert.equal(summary.rarity.totalKnown, 2);
    assert.equal(summary.derived.avgGoldPerCombat, 50);
    assert.equal(summary.derived.avgXpPerCombat, 40);
});
