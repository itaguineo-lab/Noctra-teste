const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    buildSafeLootDetail,
    buildShortItemToken,
    buildShortCallbackToken
} = combatFixed.__private;

function buildPlayerWithItem(item) {
    return {
        inventory: [item],
        equipment: {
            weapon: null,
            shield: null,
            armor: null,
            necklace: null,
            ring: null,
            boots: null
        }
    };
}

test('buildSafeLootDetail gera texto simples sem depender de Markdown', () => {
    const item = {
        id: 'drop_123',
        instanceId: 'drop_123',
        name: 'Anel Vigilante',
        emoji: '💍',
        slot: 'ring',
        category: 'jewelry',
        uiCategory: 'rings',
        displayCategory: 'Anel',
        rarity: 'Comum',
        level: 1,
        atk: 1,
        def: 2,
        hp: 4,
        crit: 1,
        power: 19,
        powerTier: 'Bom',
        originMap: 'Clareira Sombria',
        setName: 'Sombras da Clareira',
        traitLabel: 'Guardião',
        flavor: 'Marcado pela primeira escuridão de Noctra.'
    };

    const text = buildSafeLootDetail(buildPlayerWithItem(item), item);

    assert.match(text, /ITEM DROPADO/);
    assert.match(text, /Anel Vigilante/);
    assert.match(text, /Atributos:/);
    assert.match(text, /Poder: 19/);
    assert.match(text, /Clareira Sombria/);
    assert.equal(text.includes('*'), false);
    assert.ok(text.length < 3500);
});

test('buildShortCallbackToken nunca deixa callback_data estourar', () => {
    const longToken = 'drop_' + 'x'.repeat(200);
    assert.equal(buildShortCallbackToken(longToken), 'latest');
    assert.equal(buildShortCallbackToken('drop_123'), 'drop_123');
    assert.equal(buildShortCallbackToken(''), 'latest');
});

test('buildShortItemToken cai para latest quando a chave do item é longa demais', () => {
    const item = {
        id: 'drop_' + 'x'.repeat(200),
        instanceId: 'drop_' + 'x'.repeat(200),
        legacyBase: 'legacy_' + 'x'.repeat(200),
        name: 'Item Longo',
        slot: 'weapon',
        category: 'weapon',
        uiCategory: 'weapons',
        rarity: 'Comum',
        level: 1,
        atk: 1
    };

    assert.equal(buildShortItemToken(item), 'latest');
});
