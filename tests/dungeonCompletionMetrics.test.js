const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDefaultCounters,
    buildMetricsSummary
} = require('../src/core/metrics/metricsService');

test('dungeon concluída deve refletir item final garantido na métrica derivada', () => {
    const counters = buildDefaultCounters();

    counters.dungeonsStarted = 4;
    counters.dungeonsCompleted = 4;
    counters.dungeonCommonCompletionItems = 4;
    counters.dungeonCompletionItems = 4;

    const summary = buildMetricsSummary({
        dateKey: '2026-05-02',
        counters
    });

    assert.equal(summary.derived.commonDungeonCompleted, 4);
    assert.equal(summary.derived.commonCompletionItemRate, '100.0');
});

test('dungeon concluída sem item final continua acusando métrica crítica', () => {
    const counters = buildDefaultCounters();

    counters.dungeonsStarted = 4;
    counters.dungeonsCompleted = 4;
    counters.dungeonCommonCompletionItems = 0;

    const summary = buildMetricsSummary({
        dateKey: '2026-05-02',
        counters
    });

    assert.equal(summary.derived.commonDungeonCompleted, 4);
    assert.equal(summary.derived.commonCompletionItemRate, '0.0');
    assert.equal(summary.dungeonAudit.severity, 'red');
});

test('dungeon elite concluída contabiliza item final elite separado de comum', () => {
    const counters = buildDefaultCounters();

    counters.dungeonsStarted = 2;
    counters.dungeonEliteStarted = 2;
    counters.dungeonsCompleted = 2;
    counters.dungeonEliteCompleted = 2;
    counters.dungeonCompletionItems = 2;
    counters.dungeonCommonCompletionItems = 0;
    counters.dungeonEliteCompletionItems = 2;

    const summary = buildMetricsSummary({
        dateKey: '2026-05-02',
        counters
    });

    assert.equal(summary.derived.commonDungeonCompleted, 0);
    assert.equal(summary.derived.commonCompletionItemRate, '0.0');
    assert.equal(summary.derived.eliteCompletionItemRate, '100.0');
});
