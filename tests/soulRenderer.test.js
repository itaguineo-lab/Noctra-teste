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
    buildSoulCommandHelpLine,
    buildSoulCooldownLine,
    formatSoulLevel,
    getSoulIdentityLine,
    getSoulCommandId,
    getSoulInstanceId,
    getSoulTypeLine
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
        cooldownTurns: 3,
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
        cooldownTurns: 3,
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
        cooldownTurns: 0,
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

test('getSoulCommandId prioriza id base e getSoulInstanceId mantém dado técnico interno', () => {
    const textSoul = damageSoul({ id: 'soul_wolf', instanceId: 'uuid-123' });

    assert.equal(getSoulCommandId(textSoul), 'soul_wolf');
    assert.equal(getSoulInstanceId(textSoul), 'uuid-123');
});

test('getSoulIdentityLine inclui raridade, grau e level', () => {
    const text = getSoulIdentityLine(frostSoul({ level: 2 }));

    assert.match(text, /Épico/);
    assert.match(text, /Grau II/);
    assert.match(text, /Lv\.2/);
});

test('getSoulTypeLine descreve tipo de uso sem jargão técnico', () => {
    assert.equal(getSoulTypeLine(damageSoul()), '⚔️ Habilidade ativa');
    assert.equal(getSoulTypeLine(passiveSoul()), '🌘 Passiva permanente');
});

test('buildSoulCooldownLine descreve cooldown e passiva', () => {
    assert.equal(buildSoulCooldownLine(damageSoul()), '⏳ Recarga: 3 turnos');
    assert.equal(buildSoulCooldownLine(passiveSoul()), '🌘 Passiva permanente');
});

test('buildSoulEffectSummary descreve dano ativo compacto', () => {
    assert.equal(buildSoulEffectSummary(damageSoul()), 'Golpe ativo • 135% do ATK');
});

test('buildSoulEffectSummary descreve controle adicional', () => {
    const text = buildSoulEffectSummary(frostSoul());

    assert.match(text, /150% do ATK/);
    assert.match(text, /25% congelar/);
});

test('buildSoulEffectSummary descreve passiva', () => {
    const text = buildSoulEffectSummary(passiveSoul());

    assert.match(text, /Passiva/);
    assert.match(text, /DEF \+10/);
    assert.match(text, /HP \+30/);
});

test('buildSoulEffectDetail descreve efeito em linguagem de jogador', () => {
    const text = buildSoulEffectDetail(frostSoul());

    assert.match(text, /Causa 150% do seu ATK como dano/);
    assert.match(text, /Chance de congelar: 25%/);
});

test('buildSoulCommandHelpLine não mostra comando técnico na tela do jogador', () => {
    const text = buildSoulCommandHelpLine(damageSoul({ instanceId: 'uuid-123' }));

    assert.equal(text, 'Escolha abaixo em qual slot deseja equipar.');
    assert.doesNotMatch(text, /equipsoul/);
});

test('buildSoulCard renderiza card compacto com recarga', () => {
    const text = buildSoulCard(damageSoul(), 1);

    assert.match(text, /1\. 🐺 Alma do Lobo Sombrio/);
    assert.match(text, /Raro/);
    assert.match(text, /Golpe ativo/);
    assert.match(text, /Recarga: 3 turnos/);
    assert.match(text, /XP 0\/3/);
});

test('buildEquippedSoulsBlock mostra slots vazios e equipados', () => {
    const text = buildEquippedSoulsBlock([damageSoul(), null]);

    assert.match(text, /EQUIPADAS/);
    assert.match(text, /Vazio/);
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

test('buildSoulDetailText mostra detalhe individual sem ids técnicos ou comandos', () => {
    const text = buildSoulDetailText(passiveSoul({ instanceId: 'uuid-guardian' }), { slot: 1 });

    assert.match(text, /Alma Guardiã/);
    assert.doesNotMatch(text, /ID:/);
    assert.doesNotMatch(text, /Instância:/);
    assert.doesNotMatch(text, /uuid-guardian/);
    assert.doesNotMatch(text, /soul_guardian/);
    assert.doesNotMatch(text, /equipsoul/);
    assert.match(text, /Equipamento: Slot 2/);
    assert.match(text, /EFEITO/);
    assert.match(text, /EVOLUÇÃO/);
    assert.match(text, /Guardião do Pântano/);
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
    assert.match(text, /Abra o inventário/);
});
