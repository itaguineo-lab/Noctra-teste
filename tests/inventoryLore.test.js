const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildLoreBlock,
    buildEnhancedItemDetailText
} = require('../src/core/player/itemLorePresenter');

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
    const text = buildEnhancedItemDetailText({
        item: {
            id: 'item_test',
            instanceId: 'item_test',
            name: 'Arco Preciso do Pântano',
            emoji: '🏹',
            rarity: 'Raro',
            level: 15,
            slot: 'weapon',
            allowedClasses: ['arqueiro'],
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
        },
        slotLabel: 'Arma',
        slotIcon: '🏹',
        buildRuleText: 'Combina com Aljava.',
        comparisonStatus: 'Slot vazio',
        comparisonDetail: 'Nenhum item equipado neste slot.',
        isEquipped: false
    });

    assert.match(text, /ARCO PRECISO DO PÂNTANO/);
    assert.match(text, /Identidade/);
    assert.match(text, /Pântano Corrompido/);
    assert.match(text, /Lodo Corrompido/);
    assert.match(text, /Preciso/);
    assert.match(text, /Atributos/);
    assert.match(text, /Comparação por atributo/);
    assert.match(text, /Poder/);
});

test('buildEnhancedItemDetailText mostra slot vazio quando não há equipado', () => {
    const text = buildEnhancedItemDetailText({
        item: {
            name: 'Espada de Teste',
            rarity: 'Comum',
            level: 1,
            atk: 5,
            def: 0,
            hp: 0,
            crit: 0
        },
        slotLabel: 'Arma',
        slotIcon: '⚔️',
        buildRuleText: 'Pode ser usada sem mão secundária.',
        comparisonStatus: 'Slot vazio',
        comparisonDetail: 'Nenhum item equipado neste slot.',
        equippedItem: null,
        isEquipped: false
    });

    assert.equal(text.includes('Slot vazio\\. Este item será equipado direto\\.'), true);
});

test('buildEnhancedItemDetailText mostra item já equipado', () => {
    const text = buildEnhancedItemDetailText({
        item: {
            name: 'Escudo de Teste',
            rarity: 'Comum',
            level: 1,
            atk: 0,
            def: 3,
            hp: 0,
            crit: 0
        },
        slotLabel: 'Mão Secundária',
        slotIcon: '🛡️',
        buildRuleText: 'Mão secundária.',
        comparisonStatus: 'Equipado agora',
        comparisonDetail: 'Este item já está equipado.',
        equippedItem: { def: 3 },
        isEquipped: true
    });

    assert.equal(text.includes('Este item já está equipado\\.'), true);
});

test('buildEnhancedItemDetailText mostra deltas positivos e CRIT em porcentagem', () => {
    const text = buildEnhancedItemDetailText({
        item: {
            name: 'Arco Melhorado',
            rarity: 'Raro',
            level: 5,
            atk: 5,
            def: 2,
            hp: 10,
            crit: 2
        },
        slotLabel: 'Arma',
        slotIcon: '🏹',
        buildRuleText: 'Combina com Aljava.',
        comparisonStatus: '📈 +10 poder',
        comparisonDetail: 'Melhor que Arco Antigo.',
        equippedItem: {
            atk: 3,
            def: 1,
            hp: 0,
            crit: 0
        },
        isEquipped: false
    });

    assert.equal(text.includes('⚔️ ATK: 3 → 5 \\(\\+2\\)'), true);
    assert.equal(text.includes('🛡️ DEF: 1 → 2 \\(\\+1\\)'), true);
    assert.equal(text.includes('❤️ HP: 0 → 10 \\(\\+10\\)'), true);
    assert.equal(text.includes('💥 CRIT: 0% → 2% \\(\\+2%\\)'), true);
    assert.match(text, /\*Poder:\*/);
    assert.match(text, /\*Comparação:\*/);
});

test('buildEnhancedItemDetailText mostra deltas negativos', () => {
    const text = buildEnhancedItemDetailText({
        item: {
            name: 'Armadura Gasta',
            rarity: 'Comum',
            level: 4,
            atk: 1,
            def: 0,
            hp: 2,
            crit: 0
        },
        slotLabel: 'Armadura',
        slotIcon: '🛡️',
        buildRuleText: 'Item de equipamento.',
        comparisonStatus: '📉 -5 poder',
        comparisonDetail: 'Pior que Armadura Forte.',
        equippedItem: {
            atk: 3,
            def: 1,
            hp: 10,
            crit: 2
        },
        isEquipped: false
    });

    assert.equal(text.includes('⚔️ ATK: 3 → 1 \\(\\-2\\)'), true);
    assert.equal(text.includes('🛡️ DEF: 1 → 0 \\(\\-1\\)'), true);
    assert.equal(text.includes('❤️ HP: 10 → 2 \\(\\-8\\)'), true);
    assert.equal(text.includes('💥 CRIT: 2% → 0% \\(\\-2%\\)'), true);
});
