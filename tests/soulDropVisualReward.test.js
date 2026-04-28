const test = require('node:test');
const assert = require('node:assert/strict');

const rewardService = require('../src/services/rewardService');

const {
    getSoulSourceLabel,
    buildCompactSoulLootLine,
    buildFullSoulDropText
} = rewardService.__private;

function soul(overrides = {}) {
    return {
        id: 'soul_wolf',
        instanceId: 'inst_wolf',
        bossId: 'alpha_shadow_wolf',
        name: 'Alma do Lobo Sombrio',
        rarity: 'Raro',
        tier: 1,
        emoji: '🐺',
        level: 1,
        exp: 0,
        shards: 0,
        effect: {
            type: 'damage',
            multiplier: 1.35
        },
        ...overrides
    };
}

function enemy(overrides = {}) {
    return {
        id: 'alpha_shadow_wolf',
        name: 'Alfa da Matilha',
        isBoss: true,
        ...overrides
    };
}

test('getSoulSourceLabel traduz fontes de alma', () => {
    assert.equal(getSoulSourceLabel('field_boss'), 'Boss de Campo');
    assert.equal(getSoulSourceLabel('dungeon_boss'), 'Boss de Masmorra');
    assert.equal(getSoulSourceLabel('world_boss'), 'World Boss');
    assert.equal(getSoulSourceLabel('unknown'), 'Fonte rara');
});

test('buildCompactSoulLootLine cria linha compacta de loot raro', () => {
    const text = buildCompactSoulLootLine(soul(), 'field_boss', enemy());

    assert.match(text, /ALMA ENCONTRADA/);
    assert.match(text, /Alma do Lobo Sombrio/);
    assert.match(text, /Raro/);
    assert.match(text, /Tier 1/);
    assert.match(text, /Boss de Campo/);
    assert.match(text, /Alfa da Matilha/);
});

test('buildFullSoulDropText cria tela especial de alma', () => {
    const text = buildFullSoulDropText(soul(), 'field_boss', enemy());

    assert.match(text, /ALMA ENCONTRADA/);
    assert.match(text, /Boss de Campo/);
    assert.match(text, /Alfa da Matilha/);
    assert.match(text, /Alma do Lobo Sombrio/);
    assert.match(text, /coleção/);
});
