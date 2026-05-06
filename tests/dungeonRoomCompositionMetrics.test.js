const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDefaultCounters,
    buildMetricsSummary,
    getDungeonRoomTypeCounter
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
    assert.equal(summary.derived.dungeonCombatRoomRate, '80.0');
    assert.equal(summary.derived.dungeonEventRoomRate, '20.0');
});
