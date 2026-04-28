const test = require('node:test');
const assert = require('node:assert/strict');

const shop = require('../src/handlers/shop');
const {
    buildItemButtonLabel,
    getShopItemTypeLabel,
    renderShop
} = require('../src/menus/shopMenu');

const {
    buildBuyDetailText,
    buildSellPreviewText,
    getPurchaseDeliveryText,
    getWalletInline
} = shop.__private;

test('buildBuyDetailText mostra detalhe e confirmação financeira antes da compra', () => {
    const player = { gold: 500, nox: 0, glorias: 0 };
    const item = {
        id: 'hp_potion',
        name: 'Poção de Vida',
        type: 'consumable',
        effect: 'potionHp',
        currency: 'gold',
        price: 120,
        description: 'Restaura 100% do HP máximo.'
    };

    const text = buildBuyDetailText(player, item, 5);

    assert.match(text, /CONFIRMAR COMPRA/);
    assert.match(text, /Poção de Vida/);
    assert.match(text, /Quantidade: 5/);
    assert.match(text, /Total: 💰 600 ouro/);
    assert.match(text, /Faltam: 💰 100/);
});

test('getPurchaseDeliveryText diferencia consumível de recarga imediata', () => {
    assert.equal(
        getPurchaseDeliveryText({ type: 'consumable', effect: 'potionEnergy' }),
        'Vai para os consumíveis do inventário.'
    );

    assert.equal(
        getPurchaseDeliveryText({ type: 'consumable', effect: 'energyRefill' }),
        'Aplica imediatamente.'
    );

    assert.equal(
        getPurchaseDeliveryText({ type: 'vip' }),
        'Ativa imediatamente.'
    );
});

test('buildSellPreviewText mostra confirmação de venda antes de remover item', () => {
    const player = { gold: 100 };
    const item = {
        name: 'Anel Vigilante',
        emoji: '💍',
        rarity: 'Comum',
        slot: 'ring',
        displayCategory: 'Anel',
        level: 1,
        atk: 0,
        def: 2,
        hp: 4,
        crit: 1
    };

    const text = buildSellPreviewText(player, item, 0);

    assert.match(text, /CONFIRMAR VENDA/);
    assert.match(text, /Anel Vigilante/);
    assert.match(text, /Valor de venda/);
    assert.match(text, /Venda permanente/);
});

test('buildItemButtonLabel mostra se o jogador pode comprar', () => {
    const item = {
        name: 'VIP 30 Dias',
        type: 'vip',
        currency: 'nox',
        price: 89
    };

    assert.match(buildItemButtonLabel(item, { nox: 100 }), /^✅/);
    assert.match(buildItemButtonLabel(item, { nox: 0 }), /^🔒/);
});

test('getShopItemTypeLabel classifica cosméticos e VIP corretamente', () => {
    assert.equal(getShopItemTypeLabel({ type: 'vip' }), 'VIP');
    assert.equal(getShopItemTypeLabel({ type: 'cosmetic' }), 'Cosmético');
    assert.equal(getShopItemTypeLabel({ type: 'equipment', slot: 'shield' }), 'Mão Secundária');
});

test('getWalletInline gera carteira compacta para telas da loja', () => {
    const text = getWalletInline({ gold: 1250, nox: 8, glorias: 3 });

    assert.equal(text, '💰 1.250   💎 8   🏅 3');
});

test('renderShop usa hierarquia visual com divisores e status de compra', () => {
    const player = { gold: 100, nox: 0, glorias: 0 };
    const items = [
        {
            id: 'hp_potion',
            name: 'Poção de Vida',
            type: 'consumable',
            effect: 'potionHp',
            currency: 'gold',
            price: 120,
            description: 'Restaura HP.'
        }
    ];

    const { text } = renderShop('🧪 *SUPRIMENTOS*', items, player);

    assert.match(text, /━━━━━━━━━━━━━━━━━━━━━━/);
    assert.match(text, /01 • ❤️ \*Poção de Vida\*/);
    assert.match(text, /🔒 Faltam 20 ouro/);
});
