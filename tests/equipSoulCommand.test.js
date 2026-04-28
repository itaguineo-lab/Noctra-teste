const test = require('node:test');
const assert = require('node:assert/strict');

const {
    equipSoulById,
    equipSoulToExplicitSlot,
    parseEquipSoulArgs,
    parseSoulSlotToken,
    getEquippedSoulSlot,
    getSoulCommandId,
    buildOwnedSoulHelp,
    buildEquipSoulUsage,
    buildSoulNotFoundMessage
} = require('../src/commands/equip');

function soul(id, name = 'Alma Teste', overrides = {}) {
    return {
        id,
        instanceId: overrides.instanceId || id,
        name,
        rarity: 'Raro',
        tier: 1,
        emoji: '💀',
        level: 1,
        effect: {
            type: 'damage',
            multiplier: 1.2
        },
        ...overrides
    };
}

function player(overrides = {}) {
    return {
        name: 'Admin',
        class: 'guerreiro',
        level: 10,
        hp: 100,
        maxHp: 120,
        atk: 20,
        def: 10,
        crit: 5,
        inventory: [],
        equipment: {},
        soulsInventory: [soul('soul_a', 'Alma A'), soul('soul_b', 'Alma B')],
        soulsEquipped: [null, null],
        consumables: {},
        buffs: [],
        ...overrides
    };
}

test('parseSoulSlotToken aceita 1, 2 e variações simples', () => {
    assert.equal(parseSoulSlotToken('1'), 0);
    assert.equal(parseSoulSlotToken('2'), 1);
    assert.equal(parseSoulSlotToken('slot1'), 0);
    assert.equal(parseSoulSlotToken('slot:2'), 1);
    assert.equal(parseSoulSlotToken('s1'), 0);
    assert.equal(parseSoulSlotToken('3'), null);
});

test('parseEquipSoulArgs separa id e slot opcional', () => {
    assert.deepEqual(parseEquipSoulArgs('/equipsoul soul_a 1'), {
        soulId: 'soul_a',
        slot: 0
    });

    assert.deepEqual(parseEquipSoulArgs('/equipsoul alma:boss/123 slot2'), {
        soulId: 'alma:boss/123',
        slot: 1
    });

    assert.deepEqual(parseEquipSoulArgs('/equipsoul soul_a'), {
        soulId: 'soul_a',
        slot: null
    });
});

test('getSoulCommandId prioriza id base para comando', () => {
    const s = soul('soul_wolf', 'Alma do Lobo', { instanceId: 'uuid-123' });
    assert.equal(getSoulCommandId(s), 'soul_wolf');
});

test('equipSoulById sem slot mantém fluxo automático antigo', () => {
    const p = player();
    const result = equipSoulById(p, 'soul_a');

    assert.equal(result.ok, true);
    assert.equal(result.slot, 0);
    assert.equal(p.soulsEquipped[0].name, 'Alma A');
    assert.equal(p.soulsInventory.some(s => s.instanceId === 'soul_a'), false);
});

test('equipSoulById aceita id base mesmo com instanceId diferente', () => {
    const p = player({
        soulsInventory: [soul('soul_wolf', 'Alma do Lobo', { instanceId: 'uuid-123' })]
    });

    const result = equipSoulById(p, 'soul_wolf', 0);

    assert.equal(result.ok, true);
    assert.equal(p.soulsEquipped[0].name, 'Alma do Lobo');
});

test('equipSoulById com slot equipa no slot explícito', () => {
    const p = player();
    const result = equipSoulById(p, 'soul_a', 1);

    assert.equal(result.ok, true);
    assert.equal(result.slot, 1);
    assert.equal(p.soulsEquipped[1].name, 'Alma A');
});

test('equipSoulToExplicitSlot substitui alma e devolve antiga para coleção', () => {
    const p = player({
        soulsInventory: [soul('soul_b', 'Alma B')],
        soulsEquipped: [soul('soul_a', 'Alma A'), null]
    });

    const result = equipSoulToExplicitSlot(p, 'soul_b', 0);

    assert.equal(result.ok, true);
    assert.equal(result.replaced.name, 'Alma A');
    assert.equal(p.soulsEquipped[0].name, 'Alma B');
    assert.equal(p.soulsInventory.some(s => s.instanceId === 'soul_a'), true);
});

test('equipSoulToExplicitSlot bloqueia mover alma já equipada para outro slot', () => {
    const p = player({
        soulsInventory: [],
        soulsEquipped: [soul('soul_a', 'Alma A'), null]
    });

    const result = equipSoulToExplicitSlot(p, 'soul_a', 1);

    assert.equal(result.ok, false);
    assert.match(result.message, /já está equipada no Slot 1/);
    assert.equal(getEquippedSoulSlot(p, 'soul_a'), 0);
});

test('equipSoulToExplicitSlot valida slot e alma inexistente com ajuda útil', () => {
    assert.equal(equipSoulToExplicitSlot(player(), 'soul_a', 9).ok, false);

    const missing = equipSoulToExplicitSlot(player(), 'inst_wolf', 0);
    assert.equal(missing.ok, false);
    assert.match(missing.message, /inst_wolf/);
    assert.match(missing.message, /só exemplo de teste/);
    assert.match(missing.message, /Almas disponíveis/);
});

test('buildOwnedSoulHelp lista IDs reais disponíveis', () => {
    const text = buildOwnedSoulHelp(player({
        soulsInventory: [soul('soul_wolf', 'Alma do Lobo', { instanceId: 'uuid-123' })]
    }));

    assert.match(text, /Alma do Lobo/);
    assert.match(text, /ID: soul_wolf/);
    assert.match(text, /\/equipsoul soul_wolf 1/);
});

test('buildEquipSoulUsage mostra uso e exemplos', () => {
    const text = buildEquipSoulUsage(player());

    assert.match(text, /\/equipsoul ID_DA_ALMA/);
    assert.match(text, /\/equipsoul soul_wolf 1/);
    assert.match(text, /Almas disponíveis/);
});

test('buildSoulNotFoundMessage explica inst_wolf e lista almas reais', () => {
    const text = buildSoulNotFoundMessage(player(), 'inst_wolf');

    assert.match(text, /Alma não encontrada: inst_wolf/);
    assert.match(text, /inst_wolf.*exemplo de teste/);
    assert.match(text, /Almas disponíveis/);
});
