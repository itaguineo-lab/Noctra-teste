const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDungeonRoomTypes,
    getRoomVariantPool,
    createDungeonRoom
} = require('../src/core/dungeon/dungeonRooms');

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Admin',
        level: 20,
        currentMap: 'clareira_sombria',
        ...overrides
    };
}

function withRandomSequence(sequence, fn) {
    const originalRandom = Math.random;
    let index = 0;

    Math.random = () => {
        const value = sequence[index % sequence.length];
        index += 1;
        return value;
    };

    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
}

test('buildDungeonRoomTypes sempre começa com combate e termina com boss', () => {
    withRandomSequence([0.42, 0.71, 0.18, 0.9], () => {
        const types = buildDungeonRoomTypes(5);

        assert.equal(types.length, 5);
        assert.equal(types[0], 'combat');
        assert.equal(types[types.length - 1], 'boss');
    });
});

test('buildDungeonRoomTypes garante pelo menos um evento e uma ameaça antes do boss', () => {
    withRandomSequence([0.01, 0.02, 0.03, 0.04, 0.05], () => {
        const types = buildDungeonRoomTypes(5);
        const hasEvent = types.some(type => ['treasure', 'heal', 'curse', 'shrine'].includes(type));
        const hasDanger = types.some(type => ['elite', 'curse'].includes(type));

        assert.equal(hasEvent, true, `tipos gerados: ${types.join(',')}`);
        assert.equal(hasDanger, true, `tipos gerados: ${types.join(',')}`);
    });
});

test('buildDungeonRoomTypes reduz repetição consecutiva de salas não-combate', () => {
    withRandomSequence([0.0, 0.0, 0.0, 0.0], () => {
        const types = buildDungeonRoomTypes(5);

        for (let i = 1; i < types.length - 1; i += 1) {
            if (types[i] !== 'combat') {
                assert.notEqual(types[i], types[i - 1], `repetiu ${types[i]} em ${types.join(',')}`);
            }
        }
    });
});

test('cada mapa oficial tem variações próprias para sala de combate', () => {
    const clareira = getRoomVariantPool('clareira_sombria', 'combat').map(room => room.title);
    const cripta = getRoomVariantPool('cripta_em_ruinas', 'combat').map(room => room.title);
    const pantano = getRoomVariantPool('pantano_corrompido', 'combat').map(room => room.title);
    const deserto = getRoomVariantPool('deserto_incandescente', 'combat').map(room => room.title);

    assert.equal(clareira.includes('Trilha Fechada'), true);
    assert.equal(cripta.includes('Galeria dos Mortos'), true);
    assert.equal(pantano.includes('Charco Tóxico'), true);
    assert.equal(deserto.includes('Duna Cortante'), true);
});

test('createDungeonRoom usa variante temática do mapa em vez de texto genérico fixo', () => {
    withRandomSequence([0, 0, 0, 0], () => {
        const room = createDungeonRoom(playerFixture({ currentMap: 'cripta_em_ruinas' }), 1, 'combat');

        assert.equal(room.title, 'Galeria dos Mortos');
        assert.equal(room.description, 'Túmulos quebrados se abrem ao seu redor.');
        assert.notEqual(room.title, 'Sala de Conflito');
        assert.ok(room.enemy);
    });
});

test('createDungeonRoom preserva inimigo apenas em salas de combate, elite e boss', () => {
    withRandomSequence([0, 0, 0, 0], () => {
        const treasure = createDungeonRoom(playerFixture(), 1, 'treasure');
        const heal = createDungeonRoom(playerFixture(), 2, 'heal');
        const curse = createDungeonRoom(playerFixture(), 3, 'curse');
        const shrine = createDungeonRoom(playerFixture(), 4, 'shrine');
        const elite = createDungeonRoom(playerFixture(), 4, 'elite');

        assert.equal(treasure.enemy, null);
        assert.equal(heal.enemy, null);
        assert.equal(curse.enemy, null);
        assert.equal(shrine.enemy, null);
        assert.ok(elite.enemy);
    });
});
