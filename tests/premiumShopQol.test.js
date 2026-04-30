const test = require('node:test');
const assert = require('node:assert/strict');

const {
    processPurchase,
    getExpectedMaxInventory,
    canBuyInventoryExpansion
} = require('../src/core/economy/shopLogic');

const { BALANCE } = require('../src/data/balance');
const { shopItems } = require('../src/data/shopItems');
const shop = require('../src/handlers/shop');

const {
    getPurchaseDeliveryText,
    getShopItemTypeLabel
} = shop.__private;

function basePlayer(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Admin',
        class: 'guerreiro',
        level: 10,
        hp: 100,
        maxHp: 120,
        atk: 20,
        def: 10,
        crit: 5,
        gold: 0,
        nox: 100,
        glorias: 0,
        inventory: [],
        equipment: {},
        consumables: {
            potionHp: 0,
            potionEnergy: 0,
            tonicStrength: 0,
            tonicDefense: 0
        },
        soulsInventory: [],
        soulsEquipped: [null, null],
        buffs: [],
        cosmetics: [],
        activeCosmetics: {},
        purchasedBundles: [],
        bonusInventory: 0,
        vip: false,
        vipExpires: null,
        energy: 20,
        maxEnergy: 20,
        ...overrides
    };
}

function itemById(id) {
    const item = shopItems.find(entry => entry.id === id);
    assert.ok(item, `Item ${id} deve existir na loja`);
    return item;
}

test('Bolsa Sombria aumenta inventário permanentemente sem dar poder direto', async () => {
    const player = basePlayer({ nox: 100 });
    const item = itemById('inventory_expansion_5');

    const result = await processPurchase(player, item, 1);

    assert.equal(result.success, true);
    assert.equal(player.nox, 85);
    assert.equal(player.bonusInventory, BALANCE.inventory.premiumExpansionStep);
    assert.equal(player.maxInventory, BALANCE.inventory.baseMax + BALANCE.inventory.premiumExpansionStep);
    assert.equal(player.inventory.length, 0);
});

test('Bolsa Sombria respeita limite máximo de expansão premium', async () => {
    const player = basePlayer({
        nox: 100,
        bonusInventory: BALANCE.inventory.premiumMaxBonus
    });
    const item = itemById('inventory_expansion_5');

    const result = await processPurchase(player, item, 1);

    assert.equal(result.success, false);
    assert.match(result.message, /limite de expansão/);
    assert.equal(player.nox, 100);
});

test('Pacote Iniciante Sombrio entrega consumíveis e cosmético sem arma, chave ou alma', async () => {
    const player = basePlayer({ nox: 100 });
    const item = itemById('starter_pack_shadow');

    const result = await processPurchase(player, item, 1);

    assert.equal(result.success, true);
    assert.equal(player.nox, 81);
    assert.equal(player.consumables.potionHp, 5);
    assert.equal(player.consumables.potionEnergy, 3);
    assert.equal(player.inventory.length, 0);
    assert.equal(player.keys || 0, 0);
    assert.equal(Array.isArray(player.souls) ? player.souls.length : 0, 0);
    assert.equal(player.cosmetics.some(c => c.id === 'cosmetic_badge_night_recruit'), true);
    assert.equal(player.purchasedBundles.includes('starter_pack_shadow'), true);
});

test('Pacote Iniciante Sombrio não pode ser comprado duas vezes', async () => {
    const player = basePlayer({ nox: 100 });
    const item = itemById('starter_pack_shadow');

    const first = await processPurchase(player, item, 1);
    const second = await processPurchase(player, item, 1);

    assert.equal(first.success, true);
    assert.equal(second.success, false);
    assert.match(second.message, /pacote já foi comprado/i);
    assert.equal(player.nox, 81);
});

test('Cosmético duplicado continua bloqueado', async () => {
    const player = basePlayer({
        nox: 100,
        cosmetics: [{ id: 'cosmetic_aura_shadow', name: 'Aura Sombria', type: 'aura' }]
    });
    const item = itemById('cosmetic_aura_shadow');

    const result = await processPurchase(player, item, 1);

    assert.equal(result.success, false);
    assert.match(result.message, /cosmético/);
    assert.equal(player.nox, 100);
});

test('helpers reconhecem tipos premium novos', () => {
    assert.equal(getShopItemTypeLabel({ type: 'inventoryExpansion' }), 'Expansão de Inventário');
    assert.equal(getShopItemTypeLabel({ type: 'bundle' }), 'Pacote');
    assert.equal(getPurchaseDeliveryText({ type: 'inventoryExpansion' }), 'Aumenta permanentemente o limite do inventário.');
    assert.equal(getPurchaseDeliveryText({ type: 'bundle' }), 'Entrega consumíveis e cosmético de compra única.');
});

test('canBuyInventoryExpansion reflete limite premium', () => {
    const item = itemById('inventory_expansion_5');

    assert.equal(canBuyInventoryExpansion(basePlayer({ bonusInventory: 0 }), item), true);
    assert.equal(canBuyInventoryExpansion(basePlayer({ bonusInventory: BALANCE.inventory.premiumMaxBonus }), item), false);
});

test('getExpectedMaxInventory soma VIP e bônus premium corretamente', () => {
    const player = basePlayer({
        vip: true,
        vipExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        bonusInventory: 10
    });

    assert.equal(getExpectedMaxInventory(player), BALANCE.inventory.vipMax + 10);
});
