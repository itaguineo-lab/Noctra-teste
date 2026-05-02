const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getShieldChanceCap,
    getShieldValueCap,
    normalizeDungeonEnemyShield,
    normalizeDungeonEnemyAbility,
    normalizeDungeonRoom
} = require('../src/core/dungeon/dungeonBalanceGuards');

const {
    startDungeonRun
} = require('../src/core/dungeon/dungeonService');

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Tester',
        class: 'guerreiro',
        level: 34,
        currentMap: 'pantano_corrompido',
        hp: 300,
        maxHp: 300,
        atk: 80,
        def: 50,
        crit: 10,
        energy: 20,
        maxEnergy: 20,
        inventory: [],
        maxInventory: 30,
        equipment: {},
        consumables: {},
        soulsInventory: [],
        soulsEquipped: [null, null],
        ...overrides
    };
}

test('getShieldChanceCap limita escudo por tipo de sala', () => {
    assert.equal(getShieldChanceCap('boss'), 0.10);
    assert.equal(getShieldChanceCap('elite'), 0.14);
    assert.equal(getShieldChanceCap('combat'), 0.16);
});

test('getShieldValueCap limita valor do escudo por tipo de sala', () => {
    assert.equal(getShieldValueCap('boss', 1000), 80);
    assert.equal(getShieldValueCap('elite', 1000), 100);
    assert.equal(getShieldValueCap('combat', 1000), 120);
});

test('normalizeDungeonEnemyShield corta escudo acumulado abusivo', () => {
    const enemy = {
        name: 'Guardião do Pântano',
        hp: 1000,
        maxHp: 1000,
        shield: 1338
    };

    normalizeDungeonEnemyShield(enemy, 'boss');

    assert.equal(enemy.shieldCap, 80);
    assert.equal(enemy.shield, 80);
});

test('normalizeDungeonEnemyAbility reduz chance de escudo abusiva em boss', () => {
    const enemy = {
        name: 'Guardião do Pântano',
        hp: 1000,
        maxHp: 1000,
        ability: { type: 'SHIELD', chance: 0.4 }
    };

    normalizeDungeonEnemyAbility(enemy, 'boss');

    assert.equal(enemy.ability.type, 'SHIELD');
    assert.equal(enemy.ability.chance, 0.10);
    assert.equal(enemy.ability.shieldGuarded, true);
});

test('normalizeDungeonEnemyAbility não altera habilidades que não são escudo', () => {
    const enemy = {
        name: 'Lorde da Cripta',
        hp: 1000,
        maxHp: 1000,
        ability: { type: 'HEAL', chance: 0.3 }
    };

    normalizeDungeonEnemyAbility(enemy, 'boss');

    assert.deepEqual(enemy.ability, { type: 'HEAL', chance: 0.3 });
});

test('normalizeDungeonRoom aplica guarda de escudo em sala de boss', () => {
    const room = {
        type: 'boss',
        enemy: {
            name: 'Boss com escudo',
            hp: 500,
            maxHp: 500,
            shield: 300,
            ability: { type: 'SHIELD', chance: 0.9 }
        }
    };

    normalizeDungeonRoom(room);

    assert.equal(room.enemy.ability.chance, 0.10);
    assert.equal(room.enemy.shield, 40);
});

test('startDungeonRun mantém maxRooms igual ao total real de salas', () => {
    const player = playerFixture({ currentMap: 'pantano_corrompido' });
    const dungeon = startDungeonRun(player);

    assert.equal(dungeon.maxRooms, dungeon.rooms.length);
    assert.equal(dungeon.maxRooms, 5);
});

test('startDungeonRun normaliza boss com escudo no Pântano', () => {
    const player = playerFixture({ currentMap: 'pantano_corrompido' });
    const dungeon = startDungeonRun(player);
    const bossRoom = dungeon.rooms.find(room => room.type === 'boss');

    assert.ok(bossRoom);
    assert.equal(bossRoom.enemy.name, 'Guardião do Pântano');
    assert.equal(bossRoom.enemy.ability.type, 'SHIELD');
    assert.equal(bossRoom.enemy.ability.chance, 0.10);
    assert.ok(bossRoom.enemy.shieldCap > 0);
});
