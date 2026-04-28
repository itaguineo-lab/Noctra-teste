const test = require('node:test');
const assert = require('node:assert/strict');

const shop = require('../src/handlers/shop');

const {
    getUsablePlayerOverride,
    normalizeShopPlayer,
    buildBuyDetailText
} = shop.__private;

test('getUsablePlayerOverride ignora função next do Telegraf', () => {
    const next = () => {};

    assert.equal(getUsablePlayerOverride(next), null);
});

test('getUsablePlayerOverride aceita objeto de player real', () => {
    const player = { gold: 100, nox: 2, glorias: 3 };

    assert.equal(getUsablePlayerOverride(player), player);
});

test('normalizeShopPlayer rejeita função next e não cria falso player vazio', () => {
    const next = () => {};

    assert.equal(normalizeShopPlayer(next), null);
});

test('handler não deve usar função next como playerOverride para detalhe de compra', () => {
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
