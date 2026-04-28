const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getRefreshedExpiresAt,
    DEFAULT_FIGHT_TIMEOUT
} = require('../src/core/combat/fightPersistence');

const combatFixed = require('../src/handlers/combatFixed');

const {
    shouldSkipEnemyTurnForConsumable,
    renderFightCaptionSafe
} = combatFixed.__private;

test('getRefreshedExpiresAt renova expiração a partir do momento atual', () => {
    const now = 1_000_000;
    const expiresAt = getRefreshedExpiresAt(DEFAULT_FIGHT_TIMEOUT, now);

    assert.equal(expiresAt, now + DEFAULT_FIGHT_TIMEOUT);
});

test('poção HP continua sem contra-ataque imediato', () => {
    assert.equal(shouldSkipEnemyTurnForConsumable('potionHp'), true);
});

test('renderer pós-poção mantém luta em formato de batalha', () => {
    const fight = {
        status: 'ongoing',
        player: {
            name: 'Admin',
            level: 11,
            hp: 242,
            maxHp: 242,
            energy: 10,
            maxEnergy: 20,
            atk: 46,
            def: 33,
            defending: false,
            stunned: false
        },
        enemy: {
            name: 'Banshee Lamentosa',
            emoji: '👻',
            level: 10,
            hp: 30,
            maxHp: 80,
            atk: 21,
            def: 8,
            crit: 5,
            poisonTurns: 0,
            bleedTurns: 0,
            shield: 0,
            frozen: false
        },
        logs: ['❤️ Poção de Vida restaurou 42 HP e encheu sua vida.']
    };

    const text = renderFightCaptionSafe(fight, 11);

    assert.match(text, /BATALHA/);
    assert.match(text, /Admin/);
    assert.match(text, /242\/242/);
    assert.match(text, /Banshee Lamentosa/);
    assert.match(text, /Poção de Vida restaurou/);
});
