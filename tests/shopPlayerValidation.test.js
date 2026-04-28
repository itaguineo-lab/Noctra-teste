const test = require('node:test');
const assert = require('node:assert/strict');

const shop = require('../src/handlers/shop');

const {
    normalizeShopPlayer,
    isValidShopPlayer,
    buildBuyDetailText
} = shop.__private;

test('isValidShopPlayer aceita qualquer objeto retornado pelo getPlayer', () => {
    assert.equal(isValidShopPlayer({}), true);
    assert.equal(isValidShopPlayer({ gold: 100 }), true);
    assert.equal(isValidShopPlayer(null), false);
    assert.equal(isValidShopPlayer(undefined), false);
});

test('normalizeShopPlayer não rejeita documento sem id direto', () => {
    const player = normalizeShopPlayer({
        gold: 100,
        nox: 2,
        glorias: 3,
        inventory: []
    });

    assert.ok(player);
    assert.equal(player.gold, 100);
    assert.equal(player.nox, 2);
    assert.equal(player.glorias, 3);
});

test('normalizeShopPlayer preserva campos necessários da loja', () => {
    const player = normalizeShopPlayer({
        gold: 300,
        nox: 10,
        glorias: 5,
        inventory: [{ id: 'item1', name: 'Item Teste' }],
        consumables: { potionHp: 1 },
        cosmetics: [{ id: 'badge', name: 'Badge', type: 'badge' }],
        equipment: { weapon: null },
        bonusInventory: 5,
        maxInventory: 25,
        energy: 10,
        maxEnergy: 20,
        keys: 2,
        purchasedBundles: ['starter_pack_shadow']
    });

    assert.equal(player.inventory.length, 1);
    assert.equal(player.consumables.potionHp, 1);
    assert.equal(player.cosmetics.length, 1);
    assert.equal(player.bonusInventory, 5);
    assert.equal(player.maxInventory, 25);
    assert.equal(player.energy, 10);
    assert.equal(player.keys, 2);
    assert.equal(player.purchasedBundles.includes('starter_pack_shadow'), true);
});

test('buildBuyDetailText continua mostrando saldo real depois da normalização', () => {
    const player = normalizeShopPlayer({
        gold: 500,
        nox: 0,
        glorias: 0
    });

    const item = {
        id: 'hp_potion',
        name: 'Poção de Vida',
        type: 'consumable',
        effect: 'potionHp',
        currency: 'gold',
        price: 120,
        description: 'Restaura HP.'
    };

    const text = buildBuyDetailText(player, item, 1);

    assert.match(text, /Saldo atual: 💰 500/);
    assert.match(text, /Após compra: 💰 380/);
});
