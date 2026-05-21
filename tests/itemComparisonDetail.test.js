const test = require('node:test');
const assert = require('node:assert/strict');

const { buildEnhancedItemDetailText } = require('../src/core/player/itemLorePresenter');

function buildBasePayload(overrides = {}) {
    return {
        item: {
            name: 'Item Teste',
            rarity: 'Comum',
            level: 1,
            atk: 0,
            def: 0,
            hp: 0,
            crit: 0,
            ...(overrides.item || {})
        },
        slotLabel: 'Arma',
        slotIcon: '⚔️',
        buildRuleText: 'Item de equipamento.',
        comparisonStatus: 'Sem comparação',
        comparisonDetail: 'Nenhum item equipado neste slot.',
        equippedItem: null,
        isEquipped: false,
        ...overrides
    };
}

test('Item sem equipado mostra "Slot vazio"', () => {
    const text = buildEnhancedItemDetailText(buildBasePayload());
    assert.equal(text.includes('Slot vazio\\. Este item será equipado direto\\.'), true);
});

test('Item já equipado mostra "Este item já está equipado"', () => {
    const text = buildEnhancedItemDetailText(buildBasePayload({
        isEquipped: true,
        equippedItem: { atk: 1, def: 1, hp: 1, crit: 1 }
    }));
    assert.equal(text.includes('Este item já está equipado\\.'), true);
});

test('Item melhor mostra delta positivo em ATK\/DEF\/HP\/CRIT', () => {
    const text = buildEnhancedItemDetailText(buildBasePayload({
        item: { atk: 5, def: 4, hp: 10, crit: 3 },
        equippedItem: { atk: 3, def: 1, hp: 0, crit: 0 }
    }));

    assert.equal(text.includes('ATK: 3 → 5 \\(\\+2\\)'), true);
    assert.equal(text.includes('DEF: 1 → 4 \\(\\+3\\)'), true);
    assert.equal(text.includes('HP: 0 → 10 \\(\\+10\\)'), true);
    assert.equal(text.includes('CRIT: 0% → 3% \\(\\+3%\\)'), true);
});

test('Item pior mostra delta negativo', () => {
    const text = buildEnhancedItemDetailText(buildBasePayload({
        item: { atk: 1, def: 0, hp: 2, crit: 0 },
        equippedItem: { atk: 3, def: 2, hp: 8, crit: 2 }
    }));

    assert.equal(text.includes('ATK: 3 → 1 \\(\\-2\\)'), true);
    assert.equal(text.includes('DEF: 2 → 0 \\(\\-2\\)'), true);
    assert.equal(text.includes('HP: 8 → 2 \\(\\-6\\)'), true);
    assert.equal(text.includes('CRIT: 2% → 0% \\(\\-2%\\)'), true);
});

test('CRIT exibe porcentagem', () => {
    const text = buildEnhancedItemDetailText(buildBasePayload({
        item: { crit: 2 },
        equippedItem: { crit: 0 }
    }));
    assert.equal(text.includes('CRIT: 0% → 2% \\(\\+2%\\)'), true);
});

test('buildEnhancedItemDetailText mantém poder e comparação geral', () => {
    const text = buildEnhancedItemDetailText(buildBasePayload({
        item: { atk: 3, def: 1, hp: 2, crit: 1 },
        comparisonStatus: '📈 +2 poder',
        comparisonDetail: 'Melhor que item equipado.',
        equippedItem: { atk: 1, def: 1, hp: 1, crit: 0 }
    }));

    assert.match(text, /\*Poder:\*/);
    assert.match(text, /\*Comparação:\*/);
    assert.equal(text.includes('Melhor que item equipado\\.'), true);
});
