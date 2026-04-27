const test = require('node:test');
const assert = require('node:assert/strict');

const inventoryV3 = require('../src/handlers/inventoryV3');

const { buildLoreBlock, buildEnhancedItemDetailText } = inventoryV3.__private;

test('buildLoreBlock exibe origem, conjunto, fonte, traço, qualidade e descrição', () => {
    const lore = buildLoreBlock({
        originMap: 'Pântano Corrompido',
        setName: 'Lodo Corrompido',
        dropSource: 'Boss',
        traitLabel: 'Preciso',
        qualityLabel: 'Notável',
        flavor: 'Impregnado pelo veneno lento do pântano.',
        tags: ['pantano', 'precise', 'raro', 'boss']
    });

    assert.match(lore, /Origem/);
    assert.match(lore, /Pântano Corrompido/);
    assert.match(lore, /Conjunto/);
    assert.match(lore, /Lodo Corrompido/);
    assert.match(lore, /Fonte/);
    assert.match(lore, /Boss/);
    assert.match(lore, /Traço/);
    assert.match(lore, /Preciso/);
    assert.match(lore, /Qualidade/);
    assert.match(lore, /Notável/);
    assert.match(lore, /Descrição/);
    assert.match(lore, /#pantano/);
});

test('buildEnhancedItemDetailText inclui bloco de identidade do item', () => {
    const item = {
        id: 'item_test',
        instanceId: 'item_test',
        name: 'Arco Preciso do Pântano',
        emoji: '🏹',
        rarity: 'Raro',
        level: 15,
        slot: 'weapon',
        category: 'weapon',
        uiCategory: 'weapons',
        allowedClasses: ['arqueiro'],
        weaponStyle: 'one_handed',
        requiredOffhandType: 'quiver',
        atk: 12,
        def: 1,
        hp: 4,
        crit: 6,
        power: 44,
        powerTier: 'Forte',
        originMap: 'Pântano Corrompido',
        setName: 'Lodo Corrompido',
        dropSource: 'Boss',
        traitLabel: 'Preciso',
        qualityLabel: 'Notável',
        flavor: 'Impregnado pelo veneno lento do pântano.',
        tags: ['pantano', 'precise', 'raro', 'boss']
    };

    const player = {
        equipment: {
            weapon: null
        }
    };

    const text = buildEnhancedItemDetailText(item, player);

    assert.match(text, /ARCO PRECISO DO PÂNTANO/);
    assert.match(text, /Identidade/);
    assert.match(text, /Pântano Corrompido/);
    assert.match(text, /Lodo Corrompido/);
    assert.match(text, /Preciso/);
    assert.match(text, /Atributos/);
    assert.match(text, /Poder/);
});
