const test = require('node:test');
const assert = require('node:assert/strict');

const {
    toSafeNumber,
    getWallet,
    getWalletInline,
    getWalletText,
    getCurrencyBalance,
    syncWalletToPlayer
} = require('../src/core/economy/walletPresenter');

const shop = require('../src/handlers/shop');
const shopMenu = require('../src/menus/shopMenu');

const {
    buildBuyDetailText,
    buildSellPreviewText,
    normalizeShopPlayer
} = shop.__private;

test('toSafeNumber aceita números em string pt-BR', () => {
    assert.equal(toSafeNumber('1.250'), 1250);
    assert.equal(toSafeNumber('1.250,50'), 1250.5);
    assert.equal(toSafeNumber('89'), 89);
});

test('getWallet lê campos oficiais e legados sem retornar zero falso', () => {
    const player = {
        ouro: '1.250',
        Nox: '12',
        glories: 7
    };

    assert.deepEqual(getWallet(player), {
        gold: 1250,
        nox: 12,
        glorias: 7
    });
});

test('syncWalletToPlayer normaliza aliases para campos oficiais', () => {
    const player = {
        ouro: 500,
        Nox: 9,
        arena: { glorias: 4 }
    };

    syncWalletToPlayer(player);

    assert.equal(player.gold, 500);
    assert.equal(player.nox, 9);
    assert.equal(player.glorias, 4);
});

test('getWalletInline mostra carteira correta com aliases', () => {
    const text = getWalletInline({
        ouro: 1500,
        Nox: 2,
        glories: 11
    });

    assert.equal(text, '💰 1.500   💎 2   🏅 11');
});

test('getWalletText mostra linhas corretas', () => {
    const text = getWalletText({
        gold: 100,
        nox: 3,
        glorias: 5
    });

    assert.match(text, /100 ouro/);
    assert.match(text, /3 Nox/);
    assert.match(text, /5 glórias/);
});

test('getCurrencyBalance centralizado funciona para loja', () => {
    const player = {
        ouro: 200,
        Nox: 8,
        glories: 4
    };

    assert.equal(getCurrencyBalance(player, 'gold'), 200);
    assert.equal(getCurrencyBalance(player, 'nox'), 8);
    assert.equal(getCurrencyBalance(player, 'glorias'), 4);
});

test('normalizeShopPlayer impede carteira zerada falsa na loja', () => {
    const player = normalizeShopPlayer({
        ouro: 900,
        Nox: 10,
        glories: 6
    });

    assert.equal(player.gold, 900);
    assert.equal(player.nox, 10);
    assert.equal(player.glorias, 6);
});

test('buildBuyDetailText usa saldo real por fallback', () => {
    const player = {
        ouro: 500
    };
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

test('buildSellPreviewText usa ouro real por fallback', () => {
    const player = { ouro: 100 };
    const item = {
        name: 'Anel Vigilante',
        rarity: 'Comum',
        slot: 'ring',
        level: 1,
        def: 2,
        hp: 4,
        crit: 1
    };

    const text = buildSellPreviewText(player, item, 0);

    assert.match(text, /Ouro atual: 💰 100/);
});

test('shopMenu calcula compra disponível usando walletPresenter', () => {
    const item = {
        id: 'vip_7d',
        name: 'VIP 7 Dias',
        type: 'vip',
        currency: 'nox',
        price: 29,
        description: 'VIP.'
    };

    const label = shopMenu.buildItemButtonLabel(item, { Nox: 30 });
    assert.match(label, /^✅/);
    assert.equal(shopMenu.getPlayerBalance({ Nox: 30 }, 'nox'), 30);
});
