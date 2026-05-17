const test = require('node:test');
const assert = require('node:assert/strict');

const {
    preserveTransientStates,
    sanitizePlayerForPersistence
} = require('../src/core/player/playerSaveGuard');

function makeFight(tag = 'fight') {
    return {
        mode: 'hunt',
        createdAt: Date.now(),
        payload: { id: tag }
    };
}

function makeArena(tag = 'arena') {
    return {
        mode: 'arena',
        createdAt: Date.now(),
        payload: { id: tag }
    };
}

test('preserveTransientStates preserva activeFight quando campo está ausente', () => {
    const existing = { activeFight: makeFight('old-fight') };
    const incoming = { id: 'p1' };

    const result = preserveTransientStates(existing, incoming);

    assert.deepEqual(result.activeFight, existing.activeFight);
});

test('preserveTransientStates respeita activeFight null explícito', () => {
    const existing = { activeFight: makeFight('old-fight') };
    const incoming = { id: 'p1', activeFight: null };

    const result = preserveTransientStates(existing, incoming);

    assert.equal(result.activeFight, null);
});

test('preserveTransientStates mantém activeFight válido enviado no incoming', () => {
    const existing = { activeFight: makeFight('old-fight') };
    const incomingFight = makeFight('new-fight');
    const incoming = { id: 'p1', activeFight: incomingFight };

    const result = preserveTransientStates(existing, incoming);

    assert.deepEqual(result.activeFight, incomingFight);
});

test('preserveTransientStates aplica a mesma regra para activeArenaBattle', () => {
    const existing = { activeArenaBattle: makeArena('old-arena') };

    const missingField = preserveTransientStates(existing, { id: 'p1' });
    assert.deepEqual(missingField.activeArenaBattle, existing.activeArenaBattle);

    const explicitNull = preserveTransientStates(existing, { id: 'p1', activeArenaBattle: null });
    assert.equal(explicitNull.activeArenaBattle, null);

    const validIncoming = makeArena('new-arena');
    const explicitObject = preserveTransientStates(existing, { id: 'p1', activeArenaBattle: validIncoming });
    assert.deepEqual(explicitObject.activeArenaBattle, validIncoming);
});

test('sanitizePlayerForPersistence mantém activeFight null sem ressuscitar estado antigo', () => {
    const sanitized = sanitizePlayerForPersistence({
        id: 'p1',
        name: 'Player',
        class: 'guerreiro',
        level: 1,
        xp: 0,
        gold: 0,
        nox: 0,
        glorias: 0,
        keys: 0,
        hp: 100,
        maxHp: 120,
        energy: 10,
        maxEnergy: 20,
        atk: 10,
        def: 5,
        crit: 5,
        inventory: [],
        soulsInventory: [],
        soulsEquipped: [null, null],
        buffs: [],
        cosmetics: [],
        equipment: {},
        consumables: {},
        activeCosmetics: {},
        achievements: {},
        activeFight: null,
        activeArenaBattle: null
    });

    assert.equal(sanitized.activeFight, null);
    assert.equal(sanitized.activeArenaBattle, null);
});
