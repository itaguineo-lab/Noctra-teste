const test = require('node:test');
const assert = require('node:assert/strict');

const inventoryV3 = require('../src/handlers/inventoryV3');
const { buildSoulsOverviewText } = require('../src/renderers/soulRenderer');

const {
    buildSoulsKeyboard,
    normalizePlayerState,
    getCategory
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
        soulsInventory: [soul()],
        soulsEquipped: [soul(), null],
        consumables: {},
        cosmetics: [],
        activeCosmetics: {},
        ...overrides
    };
}

test('getCategory normaliza souls sem cair em equipamento', () => {
    assert.equal(getCategory('souls'), 'souls');
});

test('normalizePlayerState preserva soulsInventory e soulsEquipped', () => {
    const normalized = normalizePlayerState(player());

    assert.equal(Array.isArray(normalized.soulsInventory), true);
    assert.equal(Array.isArray(normalized.soulsEquipped), true);
    assert.equal(normalized.soulsInventory.length, 1);
    assert.equal(normalized.soulsEquipped.length, 2);
});

test('buildSoulsOverviewText usado pela integração mostra layout novo', () => {
    const text = buildSoulsOverviewText(player());

    assert.match(text, /ALMAS/);
    assert.match(text, /EQUIPADAS/);
    assert.match(text, /COLEÇÃO/);
    assert.match(text, /Pity de boss/);
    assert.match(text, /Alma do Lobo Sombrio/);
});

test('buildSoulsKeyboard mantém callbacks antigos de equipar e desequipar', () => {
    const keyboard = buildSoulsKeyboard(player());
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /equip_soul_inst_wolf/);
    assert.match(raw, /unequip_soul_0/);
    assert.match(raw, /inventory/);
    assert.match(raw, /menu/);
});

test('buildSoulsKeyboard funciona com jogador sem almas', () => {
    const keyboard = buildSoulsKeyboard(player({
        soulsInventory: [],
        soulsEquipped: [null, null]
    }));

    const raw = JSON.stringify(keyboard.reply_markup);

    assert.doesNotMatch(raw, /equip_soul_/);
    assert.doesNotMatch(raw, /unequip_soul_/);
    assert.match(raw, /inventory/);
    assert.match(raw, /menu/);
});
