const test = require('node:test');
const assert = require('node:assert/strict');

const {
    migrateLegacyArenaCoinsToGlorias,
    getArenaGloriasBalance,
    spendArenaGlorias,
    addArenaGlorias
} = require('../src/core/arena/arenaCurrency');

const arenaShop = require('../src/handlers/arenaShop');
const { arenaShopItems } = require('../src/data/arenaShopItems');

const {
    buildArenaShopText,
    buildArenaShopKeyboard
} = arenaShop.__private;

function player(overrides = {}) {
    return {
        glorias: 0,
        arena: {
            coins: 0
        },
        ...overrides
    };
}

test('migra moedas antigas da arena para glórias uma vez', () => {
    const p = player({
        glorias: 3,
        arena: { coins: 7 }
    });

    const result = migrateLegacyArenaCoinsToGlorias(p);

    assert.equal(result.migrated, 7);
    assert.equal(p.glorias, 10);
    assert.equal(p.arena.coins, 0);

    const second = migrateLegacyArenaCoinsToGlorias(p);
    assert.equal(second.migrated, 0);
    assert.equal(p.glorias, 10);
});

test('getArenaGloriasBalance pode incluir legado antes da migração', () => {
    const p = player({
        glorias: 4,
        arena: { coins: 6 }
    });

    assert.equal(getArenaGloriasBalance(p), 10);
    assert.equal(getArenaGloriasBalance(p, { includeLegacy: false }), 4);
});

test('spendArenaGlorias migra legado antes de gastar', () => {
    const p = player({
        glorias: 2,
        arena: { coins: 5 }
    });

    const result = spendArenaGlorias(p, 6);

    assert.equal(result.success, true);
    assert.equal(p.glorias, 1);
    assert.equal(p.arena.coins, 0);
});

test('spendArenaGlorias bloqueia saldo insuficiente sem negativar', () => {
    const p = player({
        glorias: 2,
        arena: { coins: 1 }
    });

    const result = spendArenaGlorias(p, 5);

    assert.equal(result.success, false);
    assert.equal(p.glorias, 3);
    assert.equal(p.arena.coins, 0);
    assert.match(result.message, /Glórias insuficientes/);
});

test('addArenaGlorias soma glórias oficiais', () => {
    const p = player({ glorias: 1 });
    const result = addArenaGlorias(p, 4);

    assert.equal(result.success, true);
    assert.equal(p.glorias, 5);
});

test('loja da arena renderiza Glórias, não moedas da arena', () => {
    const p = player({
        glorias: 10,
        arena: { coins: 0 }
    });

    const text = buildArenaShopText(p, 0);

    assert.match(text, /Glórias/);
    assert.doesNotMatch(text, /Moedas da Arena/);
    assert.doesNotMatch(text, /moedas\b/i);
});

test('keyboard da loja usa ícone de Glórias', () => {
    const p = player({
        glorias: 10,
        arena: { coins: 0 }
    });

    const keyboard = buildArenaShopKeyboard(p);
    const raw = JSON.stringify(keyboard.reply_markup);

    assert.match(raw, /🏅/);
    assert.doesNotMatch(raw, /🪙/);
});

test('preços da loja da arena foram retunados para Glórias', () => {
    const maxPrice = Math.max(...arenaShopItems.map(item => item.price));
    const minPrice = Math.min(...arenaShopItems.map(item => item.price));

    assert.equal(minPrice >= 3, true);
    assert.equal(maxPrice <= 36, true);
});
