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

    assert.equal(commonLevel <= 11, true, `common veio Lv.${commonLevel}`);
    assert.equal(eliteLevel <= 11, true, `elite veio Lv.${eliteLevel}`);
    assert.equal(bossLevel <= 13, true, `boss veio Lv.${bossLevel}`);
});

test('dungeon da Clareira é mais difícil que farm comum do mapa', () => {
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

    assert.equal(stats.level >= 4, true, `level veio ${stats.level}`);
    assert.equal(stats.hp > template.hp * 1.45, true, `HP veio ${stats.hp}`);
    assert.equal(stats.atk > template.atk * 1.35, true, `ATK veio ${stats.atk}`);
});

test('dungeon do mapa respeita progressão de sala e tipo sem virar level do jogador', () => {
    assert.equal(getDungeonRoomLevel('cripta_em_ruinas', 'combat', 32, 1), 12);
    assert.equal(getDungeonRoomLevel('cripta_em_ruinas', 'elite', 32, 4), 16);
    assert.equal(getDungeonRoomLevel('cripta_em_ruinas', 'boss', 32, 5), 19);
});

test('scaleDungeonEnemyStats usa template do mapa com bônus forte de dungeon', () => {
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

    assert.equal(stats.level <= 11, true);
    assert.equal(stats.hp >= 50, true, `HP veio ${stats.hp}`);
    assert.equal(stats.hp < 130, true, `HP veio ${stats.hp}`);
    assert.equal(stats.atk >= 14, true, `ATK veio ${stats.atk}`);
    assert.equal(stats.atk < 30, true, `ATK veio ${stats.atk}`);
});

test('getRandomDungeonEnemy ancora inimigo no mapa mesmo com jogador overlevel', () => {
    const enemy = getRandomDungeonEnemy('clareira_sombria', 'combat', 32, 1);

    assert.equal(enemy.level <= 11, true, `inimigo veio Lv.${enemy.level}`);
    assert.equal(enemy.maxHp >= 49, true, `HP veio ${enemy.maxHp}`);
    assert.equal(enemy.maxHp < 160, true, `HP veio ${enemy.maxHp}`);
    assert.equal(enemy.atk < 35, true, `ATK veio ${enemy.atk}`);
});

test('createDungeonRoom usa scaling ancorado e mais difícil que mapa normal', () => {
    const room = createDungeonRoom(playerFixture({ level: 32, currentMap: 'clareira_sombria' }), 1, 'combat');

    assert.ok(room.enemy);
    assert.equal(room.enemy.level <= 11, true, `sala veio com inimigo Lv.${room.enemy.level}`);
    assert.equal(room.enemy.maxHp >= 49, true, `HP veio ${room.enemy.maxHp}`);
    assert.equal(room.enemy.maxHp < 160, true, `HP veio ${room.enemy.maxHp}`);
});
