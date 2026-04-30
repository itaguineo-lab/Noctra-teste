const test = require('node:test');
const assert = require('node:assert/strict');

const inventoryV3 = require('../src/handlers/inventoryV3');

const {
    applySoulEquipToSlot,
    buildSoulSlotRows,
    buildSoulDetailKeyboard,
    getSoulSlotButtonLabel,
    getEquippedSoulSlot,
    normalizePlayerState
} = inventoryV3.__private;

function soul(id, name = 'Alma Teste') {
    return {
        id,
        instanceId: id,
        name,
        rarity: 'Raro',
        tier: 1,
        emoji: '💀',
        level: 1,
        effect: {
            type: 'damage',
            multiplier: 1.2
        }
    };
}

function player(overrides = {}) {
    return normalizePlayerState({
        id: 'test-player',
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
        cosmetics: [],
        activeCosmetics: {},
        ...overrides
    });
}

test('applySoulEquipToSlot equipa alma no slot escolhido', () => {
    const p = player();
    const result = applySoulEquipToSlot(p, 'soul_a', 1);

    assert.equal(result.success, true);
    assert.equal(result.slot, 1);
    assert.equal(p.soulsEquipped[1].name, 'Alma A');
    assert.equal(p.soulsInventory.some(s => s.instanceId === 'soul_a'), false);
});

test('applySoulEquipToSlot substitui alma existente e devolve antiga para coleção', () => {
    const p = player({
        soulsInventory: [soul('soul_b', 'Alma B')],
        soulsEquipped: [soul('soul_a', 'Alma A'), null]
    });

    const result = applySoulEquipToSlot(p, 'soul_b', 0);

    assert.equal(result.success, true);
    assert.equal(result.replaced.name, 'Alma A');
    assert.equal(p.soulsEquipped[0].name, 'Alma B');
    assert.equal(p.soulsInventory.some(s => s.instanceId === 'soul_a'), true);
});

test('applySoulEquipToSlot bloqueia mover alma já equipada para outro slot', () => {
    const p = player({
        soulsInventory: [soul('soul_b', 'Alma B')],
        soulsEquipped: [soul('soul_a', 'Alma A'), null]
    });

    const result = applySoulEquipToSlot(p, 'soul_a', 1);

    assert.equal(result.success, false);
    assert.match(result.message, /já está equipada no Slot 1/);
});

test('applySoulEquipToSlot aceita alma já equipada no mesmo slot como idempotente', () => {
    const p = player({
        soulsInventory: [],
        soulsEquipped: [soul('soul_a', 'Alma A'), null]
    });

    const result = applySoulEquipToSlot(p, 'soul_a', 0);

    assert.equal(result.success, true);
    assert.equal(result.unchanged, true);
    assert.equal(p.soulsEquipped[0].name, 'Alma A');
});

test('applySoulEquipToSlot valida slot inválido e alma inexistente', () => {
    assert.equal(applySoulEquipToSlot(player(), 'soul_a', 9).success, false);
    assert.equal(applySoulEquipToSlot(player(), 'missing', 0).success, false);
});

test('getSoulSlotButtonLabel mostra slot vazio ou substituição', () => {
    const empty = player();
    const occupied = player({ soulsEquipped: [soul('soul_a', 'Alma A'), null] });

    assert.equal(getSoulSlotButtonLabel(empty, 0), '💀 Equipar no Slot 1');
    assert.match(getSoulSlotButtonLabel(occupied, 0), /Substituir Slot 1/);
});

test('buildSoulSlotRows cria botões para Slot 1 e Slot 2', () => {
    const rows = buildSoulSlotRows(player(), soul('soul_a', 'Alma A'));
    const raw = JSON.stringify(rows);

    assert.match(raw, /equip_soul_slot:soul_a:0/);
    assert.match(raw, /equip_soul_slot:soul_a:1/);
});

test('buildSoulDetailKeyboard de alma não equipada mostra escolha de slots', () => {
    const keyboard = buildSoulDetailKeyboard(player(), soul('soul_a', 'Alma A'));
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /Equipar no Slot 1/);
    assert.match(raw, /Equipar no Slot 2/);
    assert.match(raw, /equip_soul_slot:soul_a:0/);
    assert.match(raw, /equip_soul_slot:soul_a:1/);
});

test('buildSoulDetailKeyboard de alma equipada mantém desequipar', () => {
    const p = player({
        soulsInventory: [],
        soulsEquipped: [null, soul('soul_a', 'Alma A')]
    });

    const keyboard = buildSoulDetailKeyboard(p, soul('soul_a', 'Alma A'));
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /Desequipar do Slot 2/);
    assert.doesNotMatch(raw, /equip_soul_slot/);
    assert.equal(getEquippedSoulSlot(p, 'soul_a'), 1);
});
