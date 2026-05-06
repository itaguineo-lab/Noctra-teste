const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDefaultCounters,
    buildMetricsSummary,
    getDungeonRoomTypeCounter,
    hasKnownDungeonRoomType
} = require('../src/core/metrics/metricsService');

test('getDungeonRoomTypeCounter mapeia tipos oficiais de sala', () => {
    assert.equal(getDungeonRoomTypeCounter('combat'), 'dungeonCombatRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('elite'), 'dungeonEliteRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('boss'), 'dungeonBossRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('treasure'), 'dungeonTreasureRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('heal'), 'dungeonHealRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('curse'), 'dungeonCurseRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('shrine'), 'dungeonShrineRoomsCleared');
    assert.equal(getDungeonRoomTypeCounter('unknown'), 'dungeonOtherRoomsCleared');
});

test('hasKnownDungeonRoomType identifica apenas tipos oficiais', () => {
    assert.equal(hasKnownDungeonRoomType('combat'), true);
    assert.equal(hasKnownDungeonRoomType('elite'), true);
    assert.equal(hasKnownDungeonRoomType('boss'), true);
    assert.equal(hasKnownDungeonRoomType('treasure'), true);
    assert.equal(hasKnownDungeonRoomType('heal'), true);
    assert.equal(hasKnownDungeonRoomType('curse'), true);
    assert.equal(hasKnownDungeonRoomType('shrine'), true);
    assert.equal(hasKnownDungeonRoomType('unknown'), false);
    assert.equal(hasKnownDungeonRoomType(undefined), false);
});

test('buildMetricsSummary calcula composição de salas da dungeon', () => {
    const counters = buildDefaultCounters();

    counters.dungeonRoomsCleared = 5;
    counters.dungeonCombatRoomsCleared = 2;
    counters.dungeonEliteRoomsCleared = 1;
    counters.dungeonBossRoomsCleared = 1;
    counters.dungeonTreasureRoomsCleared = 1;

    const summary = buildMetricsSummary({
        dateKey: '2026-05-04',
        counters
    });

    assert.equal(summary.derived.dungeonCombatLikeRoomsCleared, 4);
    assert.equal(summary.derived.dungeonEventRoomsCleared, 1);
    assert.equal(summary.derived.dungeonClassifiedRoomsCleared, 5);
    assert.equal(summary.derived.dungeonUnclassifiedRoomsCleared, 0);
    assert.equal(summary.derived.dungeonCombatRoomRate, '80.0');
    assert.equal(summary.derived.dungeonEventRoomRate, '20.0');
    assert.equal(summary.derived.dungeonClassifiedRoomRate, '100.0');
    assert.equal(summary.derived.dungeonUnclassifiedRoomRate, '0.0');
});

test('salas sem tipo não entram como evento e expõem dívida de instrumentação', () => {
    const counters = buildDefaultCounters();

    counters.dungeonRoomsCleared = 5;

    const summary = buildMetricsSummary({
        dateKey: '2026-05-04',
        counters
    });

    assert.equal(summary.derived.dungeonCombatLikeRoomsCleared, 0);
    assert.equal(summary.derived.dungeonEventRoomsCleared, 0);
    assert.equal(summary.derived.dungeonClassifiedRoomsCleared, 0);
    assert.equal(summary.derived.dungeonUnclassifiedRoomsCleared, 5);
    assert.equal(summary.derived.dungeonCombatRoomRate, '0.0');
    assert.equal(summary.derived.dungeonEventRoomRate, '0.0');
    assert.equal(summary.derived.dungeonClassifiedRoomRate, '0.0');
    assert.equal(summary.derived.dungeonUnclassifiedRoomRate, '100.0');
});
