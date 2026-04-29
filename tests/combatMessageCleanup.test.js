const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee
} = require('../src/core/combat/combatEngine');

const { activateSoul } = require('../src/core/player/souls');
const { ENEMY_ABILITIES } = require('../src/core/world/enemies');

function player(overrides = {}) {
    return {
        id: '1',
        name: 'Admin',
        class: 'guerreiro',
        level: 1,
        hp: 120,
        maxHp: 120,
        atk: 12,
        def: 10,
        crit: 0,
        energy: 20,
        maxEnergy: 20,
        soulsEquipped: [null, null],
        ...overrides
    };
}

function enemy(overrides = {}) {
    return {
        id: 'forest_spider',
        name: 'Aranha da Floresta',
        emoji: '🕷️',
        hp: 40,
        atk: 8,
        def: 2,
        crit: 0,
        level: 1,
        xp: 25,
        gold: 15,
        ...overrides
    };
}

function assertCleanLog(text) {
    assert.doesNotMatch(text, /\*/);
    assert.doesNotMatch(text, /!/);
    assert.doesNotMatch(text, /\\!/);
    assert.doesNotMatch(text, /\\\*/);
}

test('logs básicos de combate não usam markdown cru ou exclamação', () => {
    const fight = createFight(player(), enemy());

    processPlayerTurn(fight);
    processEnemyTurn(fight);

    const text = fight.logs.join('\n');

    assert.match(text, /surgiu das sombras\./);
    assert.match(text, /Você golpeia/);
    assert.match(text, /ataca e causa/);
    assertCleanLog(text);
});

test('crítico aparece como texto limpo', () => {
    const fight = createFight(player({ crit: 100 }), enemy());

    processPlayerTurn(fight);

    const text = fight.logs.join('\n');

    assert.match(text, /Crítico\./);
    assertCleanLog(text);
});

test('falha de fuga não usa exclamação', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.99;

    try {
        const fight = createFight(player(), enemy());
        attemptFlee(fight);
        const text = fight.logs.join('\n');

        assert.match(text, /Falha na fuga\./);
        assertCleanLog(text);
    } finally {
        Math.random = originalRandom;
    }
});

test('mensagens de habilidades inimigas são limpas', () => {
    const fight = createFight(player(), enemy());

    ENEMY_ABILITIES.POISON.apply(fight.enemy, fight);
    ENEMY_ABILITIES.BLEED.apply(fight.enemy, fight);
    ENEMY_ABILITIES.STUN.apply(fight.player, fight);
    ENEMY_ABILITIES.SHIELD.apply(fight.enemy, fight);

    const text = fight.logs.join('\n');

    assert.match(text, /foi envenenado\./);
    assert.match(text, /está sangrando\./);
    assert.match(text, /atordoou você\./);
    assert.match(text, /ergueu um escudo sombrio\./);
    assertCleanLog(text);
});

test('mensagens de almas ativas são limpas', () => {
    const state = {
        player: { atk: 20, hp: 80, maxHp: 100 },
        enemy: { hp: 100 }
    };

    const damage = activateSoul({
        name: 'Alma do Lobo Sombrio',
        emoji: '🐺',
        effect: { type: 'damage', multiplier: 1.35 }
    }, state);

    const heal = activateSoul({
        name: 'Alma Curadora',
        emoji: '💚',
        effect: { type: 'heal', multiplier: 0.35 }
    }, state);

    const vampire = activateSoul({
        name: 'Alma Vampírica',
        emoji: '🩸',
        effect: { type: 'lifesteal', multiplier: 1.65, healPercent: 0.25 }
    }, state);

    const text = [damage.message, heal.message, vampire.message].join('\n');

    assert.match(text, /causa \d+ de dano\./);
    assert.match(text, /restaura \d+ HP\./);
    assert.match(text, /recupera \d+ HP\./);
    assertCleanLog(text);
});
