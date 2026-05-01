const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDefaultCounters,
    buildMetricsSummary
} = require('../src/core/metrics/metricsService');

const {
    buildDungeonRewardAudit,
    renderDungeonRewardAudit
} = require('../src/core/dungeon/dungeonRewardAudit');

const {
    renderMetricsMessage
} = require('../src/renderers/adminMetricsRenderer');

function summaryFixture(overrides = {}) {
    return buildMetricsSummary({
        dateKey: '2026-05-01',
        counters: {
            ...buildDefaultCounters(),
            ...overrides
        }
    });
}

test('renderMetricsMessage separa taxas de campo e dungeon sem taxa global por vitória', () => {
    const summary = summaryFixture({
        combatsWon: 8,
        fieldItemsDropped: 2,
        fieldSoulsDropped: 0,
        fieldKeysDropped: 1,
        dungeonsStarted: 4,
        dungeonsCompleted: 3,
        dungeonItemsDropped: 9,
        dungeonSoulsDropped: 1,
        dungeonKeysDropped: 1,
        dungeonCompletionItems: 3,
        dungeonCommonCompletionItems: 3,
        fieldGoldAwarded: 400,
        fieldXpAwarded: 320,
        dungeonGoldAwarded: 2700,
        dungeonXpAwarded: 2100,
        goldAwarded: 3100,
        xpAwarded: 2420
    });

    const text = renderMetricsMessage(summary);

    assert.match(text, /Médias — Campo/);
    assert.match(text, /Médias — Dungeon Comum/);
    assert.match(text, /Itens\/vitória campo: 25\.0%/);
    assert.match(text, /Itens\/dungeon comum: 3\.0/);
    assert.match(text, /Souls\/dungeon comum: 33\.3%/);
    assert.doesNotMatch(text, /Item drop rate por vitória/);
    assert.doesNotMatch(text, /Soul drop rate por vitória/);
    assert.doesNotMatch(text, /Key drop rate por vitória/);
});

test('auditoria mostra sem base quando não há campo suficiente para comparar dungeon', () => {
    const summary = summaryFixture({
        combatsWon: 0,
        dungeonsStarted: 2,
        dungeonsCompleted: 2,
        dungeonGoldAwarded: 2000,
        dungeonXpAwarded: 1500,
        dungeonCompletionItems: 2,
        dungeonCommonCompletionItems: 2
    });

    const audit = buildDungeonRewardAudit(summary);
    const text = renderDungeonRewardAudit(summary);

    assert.equal(audit.derived.hasFieldGoldBaseline, false);
    assert.equal(audit.derived.hasFieldXpBaseline, false);
    assert.match(text, /Ouro dungeon\/campo: sem base/);
    assert.match(text, /XP dungeon\/campo: sem base/);
    assert.match(text, /⚪ Valor ouro da dungeon comum vs campo: sem base/);
});

test('auditoria calcula ratio quando há base de campo', () => {
    const summary = summaryFixture({
        combatsWon: 10,
        fieldGoldAwarded: 500,
        fieldXpAwarded: 400,
        dungeonsStarted: 2,
        dungeonsCompleted: 2,
        dungeonGoldAwarded: 2000,
        dungeonXpAwarded: 1600,
        dungeonCompletionItems: 2,
        dungeonCommonCompletionItems: 2
    });

    const audit = buildDungeonRewardAudit(summary);
    const text = renderDungeonRewardAudit(summary);

    assert.equal(audit.derived.hasFieldGoldBaseline, true);
    assert.equal(audit.derived.hasFieldXpBaseline, true);
    assert.equal(audit.derived.commonGoldRatioVsField, 20);
    assert.equal(audit.derived.commonXpRatioVsField, 20);
    assert.match(text, /Ouro dungeon\/campo: 20x/);
    assert.match(text, /XP dungeon\/campo: 20x/);
});
