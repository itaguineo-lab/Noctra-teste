const test = require('node:test');
const assert = require('node:assert/strict');

const {
    clonePlain,
    readValue,
    getWallet,
    getWalletInline,
    getCurrencyBalance
} = require('../src/core/economy/walletPresenter');

const shop = require('../src/handlers/shop');

const {
    normalizeShopPlayer,
    isValidShopPlayer,
    buildBuyDetailText
} = shop.__private;

function mongooseLikeDoc(data) {
    return {
        _doc: data,
        toObject() {
            return { ...data };
        }
    };
}

test('walletPresenter lê documento estilo Mongoose via toObject', () => {
    const doc = mongooseLikeDoc({
        id: '123',
        gold: 1250,
        nox: 9,
        glorias: 4
    });

    assert.deepEqual(getWallet(doc), {
        gold: 1250,
        nox: 9,
        glorias: 4
    });

    assert.equal(getWalletInline(doc), '💰 1.250   💎 9   🏅 4');
});

test('walletPresenter lê documento estilo Mongoose via _doc', () => {
    const doc = {
        _doc: {
            id: '123',
            gold: 800,
            nox: 3,
            glorias: 2
        }
    };

    assert.equal(readValue(doc, 'gold'), 800);
    assert.deepEqual(getWallet(doc), {
        gold: 800,
        nox: 3,
        glorias: 2
    });
});

test('clonePlain mantém objeto simples e converte documento Mongoose', () => {
    const plain = { gold: 1 };
    const doc = mongooseLikeDoc({ gold: 2 });

    assert.equal(clonePlain(plain).gold, 1);
    assert.equal(clonePlain(doc).gold, 2);
});

test('normalizeShopPlayer não transforma player ausente em carteira 0 falsa', () => {
    assert.equal(normalizeShopPlayer(null), null);
    assert.equal(normalizeShopPlayer(undefined), null);
    assert.equal(isValidShopPlayer(null), false);
});

test('normalizeShopPlayer aceita player válido e preserva carteira real', () => {
    const player = normalizeShopPlayer(mongooseLikeDoc({
        id: 'abc',
        gold: 100,
        nox: 5,
        glorias: 7
    }));

    assert.equal(isValidShopPlayer(player), true);
    assert.equal(player.gold, 100);
    assert.equal(player.nox, 5);
    assert.equal(player.glorias, 7);
});

test('buildBuyDetailText usa saldo real de documento Mongoose', () => {
    const player = mongooseLikeDoc({
        id: 'abc',
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

test('getCurrencyBalance lê Nox e Glórias de documento Mongoose', () => {
    const player = mongooseLikeDoc({
        id: 'abc',
        nox: 12,
        glorias: 6
    });

    assert.equal(getCurrencyBalance(player, 'nox'), 12);
    assert.equal(getCurrencyBalance(player, 'glorias'), 6);
});
