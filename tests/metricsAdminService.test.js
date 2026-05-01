const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildMetricsResetPreview,
    resetMetricsForDate
} = require('../src/core/metrics/metricsAdminService');

const {
    buildDefaultCounters
} = require('../src/core/metrics/metricsService');

test('buildMetricsResetPreview normaliza data e retorna contadores zerados', () => {
    const preview = buildMetricsResetPreview('2026-05-01');

    assert.equal(preview.dateKey, '2026-05-01');
    assert.deepEqual(preview.counters, buildDefaultCounters());
    assert.equal(preview.counters.dungeonsStarted, 0);
    assert.equal(preview.counters.itemsDropped, 0);
});

test('buildMetricsResetPreview usa data atual se entrada for inválida', () => {
    const preview = buildMetricsResetPreview('data-invalida');

    assert.match(preview.dateKey, /^\d{4}-\d{2}-\d{2}$/);
});

test('resetMetricsForDate não persiste em ambiente de teste e retorna skipped', async () => {
    const result = await resetMetricsForDate('2026-05-01');

    assert.equal(result.dateKey, '2026-05-01');
    assert.equal(result.reset, false);
    assert.equal(result.persistence, 'skipped');
    assert.deepEqual(result.counters, buildDefaultCounters());
});
