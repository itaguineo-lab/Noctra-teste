const test = require('node:test');
const assert = require('node:assert/strict');

const {
    shouldPersistMetrics,
    buildFallbackMetrics,
    ensureDailyMetrics,
    addManyMetrics,
    incrementMetric,
    getTodayMetrics,
    getMetricsByDate,
    buildMetricsSummary
} = require('../src/core/metrics/metricsService');

test('shouldPersistMetrics desliga persistência durante NODE_ENV=test', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
        assert.equal(shouldPersistMetrics(), false);
    } finally {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    }
});

test('buildFallbackMetrics retorna counters completos sem acessar MongoDB', () => {
    const fallback = buildFallbackMetrics('2026-04-30');

    assert.equal(fallback.dateKey, '2026-04-30');
    assert.equal(fallback.persistence, 'skipped');
    assert.equal(fallback.counters.combatsWon, 0);
    assert.equal(fallback.counters.dungeonCompletionItems, 0);
});

test('métodos de escrita de métricas retornam rápido sem conexão no ambiente de teste', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
        const start = Date.now();

        const ensured = await ensureDailyMetrics('2026-04-30');
        const incremented = await incrementMetric('menuLoads', 1, '2026-04-30');
        const many = await addManyMetrics({ goldAwarded: 10 }, '2026-04-30');

        const elapsed = Date.now() - start;

        assert.equal(ensured, null);
        assert.equal(incremented, null);
        assert.equal(many, null);
        assert.equal(elapsed < 250, true, `métricas sem DB demoraram ${elapsed}ms`);
    } finally {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    }
});

test('leituras de métricas usam fallback em teste e continuam renderizáveis', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
        const today = await getTodayMetrics();
        const byDate = await getMetricsByDate('2026-04-30');
        const summary = buildMetricsSummary(byDate);

        assert.equal(today.persistence, 'skipped');
        assert.equal(byDate.persistence, 'skipped');
        assert.equal(summary.dateKey, '2026-04-30');
        assert.equal(summary.derived.winRate, '0.0');
        assert.ok(summary.dungeonAudit);
    } finally {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    }
});
