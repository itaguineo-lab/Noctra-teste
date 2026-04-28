const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildSoulEffectSummary,
    buildSoulEffectDetail,
    buildSoulCard,
    buildEquippedSoulsBlock,
    buildSoulCollectionBlock,
    buildSoulsOverviewText,
    buildSoulDetailText,
    buildSoulDropText,
    formatSoulLevel,
    getSoulIdentityLine
} = require('../src/renderers/soulRenderer');

function damageSoul(overrides = {}) {
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
        awakenLevel: 0,
        effect: {
            type: 'damage',
            multiplier: 1.35
        },
        ...overrides
    };
}

function frostSoul(overrides = {}) {
    return damageSoul({
        id: 'soul_frost',
        instanceId: 'inst_frost',
        bossId: 'lord_of_crypt',
        name: 'Alma Gélida',
        rarity: 'Épico',
        tier: 2,
        emoji: '❄️',
        effect: {
            type: 'damage',
            multiplier: 1.5,
            freezeChance: 0.25
        },
        ...overrides
    });
}

function passiveSoul(overrides = {}) {
    return damageSoul({
        id: 'soul_guardian',
        instanceId: 'inst_guardian',
        bossId: 'swamp_guardian',
        name: 'Alma Guardiã',
        rarity: 'Épico',
        tier: 2,
        emoji: '🛡️',
        effect: {
            type: 'passive',
            defBonus: 10,
            hpBonus: 30
        },
        ...overrides
    });
}

test('formatSoulLevel mostra despertar quando existe', () => {
    assert.equal(formatSoulLevel(damageSoul()), 'Lv.1');
    assert.equal(formatSoulLevel(damageSoul({ level: 3, awakenLevel: 2 })), 'Lv.3 • Despertar +2');
});

test('getSoulIdentityLine inclui raridade, tier e level', () => {
    const text = getSoulIdentityLine(frostSoul({ level: 2 }));

    assert.match(text, /Épico/);
    assert.match(text, /Tier 2/);
    assert.match(text, /Lv\.2/);
});

test('buildSoulEffectSummary descreve dano ativo', () => {
    assert.equal(buildSoulEffectSummary(damageSoul()), 'Dano ativo: 135% do ATK');
});

test('buildSoulEffectSummary descreve controle adicional', () => {
    const text = buildSoulEffectSummary(frostSoul());

    assert.match(text, /150% do ATK/);
    assert.match(text, /25% chance de congelar/);
});

test('buildSoulEffectSummary descreve passiva', () => {
    const text = buildSoulEffectSummary(passiveSoul());

    assert.match(text, /Passiva/);
    assert.match(text, /DEF \+10/);
    assert.match(text, /HP \+30/);
});

test('buildSoulEffectDetail descreve efeito em linhas', () => {
    const text = buildSoulEffectDetail(frostSoul());

    assert.match(text, /Tipo: Dano ativo/);
    assert.match(text, /Multiplicador: 150% do ATK/);
    assert.match(text, /Controle: 25% de chance de congelar/);
});

test('buildSoulCard renderiza card compacto', () => {
    const text = buildSoulCard(damageSoul(), 1);

    assert.match(text, /1\. 🐺 Alma do Lobo Sombrio/);
    assert.match(text, /Raro/);
    assert.match(text, /Dano ativo/);
    assert.match(text, /XP: 0\/3/);
});

test('buildEquippedSoulsBlock mostra slots vazios e equipados', () => {
    const text = buildEquippedSoulsBlock([damageSoul(), null]);

    assert.match(text, /EQUIPADAS/);
    assert.match(text, /Slot vazio/);
    assert.match(text, /Alma do Lobo Sombrio/);
});

test('buildSoulCollectionBlock mostra coleção vazia com orientação', () => {
    const text = buildSoulCollectionBlock([], []);

    assert.match(text, /Nenhuma alma encontrada/);
    assert.match(text, /Derrote bosses/);
});

test('buildSoulsOverviewText mostra visão geral completa', () => {
    const player = {
        soulsInventory: [damageSoul(), passiveSoul()],
        soulsEquipped: [damageSoul(), null],
        soulPityCounter: 4
    };

    const text = buildSoulsOverviewText(player);

    assert.match(text, /ALMAS/);
    assert.match(text, /EQUIPADAS/);
    assert.match(text, /COLEÇÃO/);
    assert.match(text, /Pity de boss: 4/);
    assert.match(text, /Alma Guardiã/);
});

test('buildSoulDetailText mostra detalhe individual', () => {
    const text = buildSoulDetailText(passiveSoul(), { slot: 1 });

    assert.match(text, /Alma Guardiã/);
    assert.match(text, /Status: equipada no Slot 2/);
    assert.match(text, /EFEITO/);
    assert.match(text, /PROGRESSO/);
    assert.match(text, /swamp_guardian/);
});

test('buildSoulDropText cria tela especial de drop', () => {
    const text = buildSoulDropText(frostSoul(), {
        enemyName: 'Lorde da Cripta',
        sourceLabel: 'Boss da Cripta'
    });

    assert.match(text, /ALMA ENCONTRADA/);
    assert.match(text, /Boss da Cripta/);
    assert.match(text, /Lorde da Cripta/);
    assert.match(text, /Alma Gélida/);
    assert.match(text, /coleção/);
});
