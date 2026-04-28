const test = require('node:test');
const assert = require('node:assert/strict');

const inventoryV3 = require('../src/handlers/inventoryV3');

const {
    buildSoulsKeyboard,
    buildSoulDetailKeyboard,
    getSoulKey,
    encodeSoulKey,
    decodeSoulKey,
    sameSoulKey,
    findSoulByKey,
    getEquippedSoulSlot,
    normalizePlayerState
} = inventoryV3.__private;

function soul(overrides = {}) {
    return {
        id: 'soul_wolf',
        instanceId: 'inst_wolf',
        name: 'Alma do Lobo Sombrio',
        rarity: 'Raro',
        tier: 1,
        emoji: '🐺',
        level: 1,
        exp: 0,
        shards: 0,
        effect: {
            type: 'damage',
            multiplier: 1.35
        },
        ...overrides
    };
}

function player(overrides = {}) {
    return normalizePlayerState({
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
        soulsInventory: [soul()],
        soulsEquipped: [null, null],
        consumables: {},
        cosmetics: [],
        activeCosmetics: {},
        ...overrides
    });
}

test('getSoulKey prioriza instanceId', () => {
    assert.equal(getSoulKey(soul()), 'inst_wolf');
    assert.equal(getSoulKey(soul({ instanceId: null })), 'soul_wolf');
});

test('encodeSoulKey e decodeSoulKey preservam IDs com caracteres especiais', () => {
    const special = soul({ instanceId: 'alma:boss/123' });
    const encoded = encodeSoulKey(special);

    assert.equal(encoded, 'alma%3Aboss%2F123');
    assert.equal(decodeSoulKey(encoded), 'alma:boss/123');
});

test('sameSoulKey compara por instanceId ou id', () => {
    assert.equal(sameSoulKey(soul(), 'inst_wolf'), true);
    assert.equal(sameSoulKey(soul(), 'soul_wolf'), true);
    assert.equal(sameSoulKey(soul(), 'outra'), false);
});

test('findSoulByKey encontra alma no inventário', () => {
    const p = player();

    assert.equal(findSoulByKey(p, 'inst_wolf').name, 'Alma do Lobo Sombrio');
});

test('findSoulByKey encontra alma equipada', () => {
    const equippedSoul = soul({ instanceId: 'equipped_1' });
    const p = player({
        soulsInventory: [],
        soulsEquipped: [equippedSoul, null]
    });

    assert.equal(findSoulByKey(p, 'equipped_1').name, 'Alma do Lobo Sombrio');
});

test('getEquippedSoulSlot retorna slot correto ou -1', () => {
    const equippedSoul = soul({ instanceId: 'equipped_1' });
    const p = player({
        soulsEquipped: [null, equippedSoul]
    });

    assert.equal(getEquippedSoulSlot(p, 'equipped_1'), 1);
    assert.equal(getEquippedSoulSlot(p, 'inst_wolf'), -1);
});

test('buildSoulsKeyboard adiciona botão Ver e mantém Auto antigo', () => {
    const keyboard = buildSoulsKeyboard(player());
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /🔎 Ver/);
    assert.match(raw, /invcat:soul:inst_wolf/);
    assert.match(raw, /💀 Auto/);
    assert.match(raw, /equip_soul_inst_wolf/);
});

test('buildSoulDetailKeyboard de alma não equipada mostra seleção de slot', () => {
    const p = player();
    const keyboard = buildSoulDetailKeyboard(p, soul());
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /Equipar no Slot 1/);
    assert.match(raw, /Equipar no Slot 2/);
    assert.match(raw, /equip_soul_slot:inst_wolf:0/);
    assert.match(raw, /equip_soul_slot:inst_wolf:1/);
    assert.match(raw, /invcat:souls/);
});

test('buildSoulDetailKeyboard de alma equipada mostra Desequipar do slot', () => {
    const equippedSoul = soul({ instanceId: 'equipped_1' });
    const p = player({
        soulsInventory: [equippedSoul],
        soulsEquipped: [null, equippedSoul]
    });

    const keyboard = buildSoulDetailKeyboard(p, equippedSoul);
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /Desequipar do Slot 2/);
    assert.match(raw, /unequip_soul_1/);
    assert.doesNotMatch(raw, /equip_soul_equipped_1/);
    assert.doesNotMatch(raw, /equip_soul_slot:equipped_1/);
});
