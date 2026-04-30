const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getMapLevelRange,
    getDungeonRoomLevel,
    scaleDungeonEnemyStats,
    getRandomDungeonEnemy,
    createDungeonRoom
} = require('../src/core/dungeon/dungeonRooms');

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Admin',
        level: 32,
        currentMap: 'clareira_sombria',
        ...overrides
    };
}

test('getMapLevelRange expõe faixas oficiais de dungeon por mapa', () => {
    assert.deepEqual(getMapLevelRange('clareira_sombria'), { min: 1, max: 8 });
    assert.deepEqual(getMapLevelRange('cripta_em_ruinas'), { min: 8, max: 15 });
    assert.deepEqual(getMapLevelRange('pantano_corrompido'), { min: 15, max: 24 });
    assert.deepEqual(getMapLevelRange('deserto_incandescente'), { min: 24, max: 32 });
});

test('dungeon da Clareira não escala para Lv.32 quando jogador é Lv.32', () => {
    const commonLevel = getDungeonRoomLevel('clareira_sombria', 'combat', 32, 1);
    const eliteLevel = getDungeonRoomLevel('clareira_sombria', 'elite', 32, 4);
    const bossLevel = getDungeonRoomLevel('clareira_sombria', 'boss', 32, 5);

    assert.equal(commonLevel <= 10, true, `common veio Lv.${commonLevel}`);
    assert.equal(eliteLevel <= 10, true, `elite veio Lv.${eliteLevel}`);
    assert.equal(bossLevel <= 11, true, `boss veio Lv.${bossLevel}`);
});

test('dungeon do mapa respeita progressão de sala e tipo sem virar level do jogador', () => {
    assert.equal(getDungeonRoomLevel('cripta_em_ruinas', 'combat', 32, 1), 11);
    assert.equal(getDungeonRoomLevel('cripta_em_ruinas', 'elite', 32, 4), 15);
    assert.equal(getDungeonRoomLevel('cripta_em_ruinas', 'boss', 32, 5), 17);
});

test('scaleDungeonEnemyStats usa template do mapa com bônus moderado de dungeon', () => {
    const template = {
        name: 'Morcego Sombrio',
        hp: 32,
        atk: 9,
        def: 1,
        crit: 8,
        xp: 27,
        gold: 14
    };

    const stats = scaleDungeonEnemyStats(template, 'clareira_sombria', 'combat', 32, 1);

    assert.equal(stats.level <= 10, true);
    assert.equal(stats.hp < 80, true, `HP veio ${stats.hp}`);
    assert.equal(stats.atk < 20, true, `ATK veio ${stats.atk}`);
});

test('getRandomDungeonEnemy ancora inimigo no mapa mesmo com jogador overlevel', () => {
    const enemy = getRandomDungeonEnemy('clareira_sombria', 'combat', 32, 1);

    assert.equal(enemy.level <= 10, true, `inimigo veio Lv.${enemy.level}`);
    assert.equal(enemy.maxHp < 130, true, `HP veio ${enemy.maxHp}`);
    assert.equal(enemy.atk < 30, true, `ATK veio ${enemy.atk}`);
});

test('createDungeonRoom usa scaling ancorado no mapa do jogador', () => {
    const room = createDungeonRoom(playerFixture({ level: 32, currentMap: 'clareira_sombria' }), 1, 'combat');

    assert.ok(room.enemy);
    assert.equal(room.enemy.level <= 10, true, `sala veio com inimigo Lv.${room.enemy.level}`);
    assert.equal(room.enemy.maxHp < 130, true, `HP veio ${room.enemy.maxHp}`);
});
