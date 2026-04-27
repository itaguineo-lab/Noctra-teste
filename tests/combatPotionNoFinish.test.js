const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    renderFightCaptionSafe,
    shouldSkipEnemyTurnForConsumable
} = combatFixed.__private;

test('potionHp deve continuar sendo ação sem contra-ataque imediato', () => {
    assert.equal(shouldSkipEnemyTurnForConsumable('potionHp'), true);
});

test('renderFightCaptionSafe renderiza luta ongoing após poção sem depender de reload', () => {
    const fight = {
        status: 'ongoing',
        player: {
            name: 'Teste',
            level: 3,
            hp: 120,
            maxHp: 120,
            energy: 10,
            maxEnergy: 20,
            atk: 12,
            def: 8,
            defending: false,
            stunned: false
        },
        enemy: {
            name: 'Lobo Sombrio',
            emoji: '🐺',
            level: 2,
            hp: 30,
            maxHp: 50,
            atk: 8,
            def: 2,
            crit: 5,
            poisonTurns: 0,
            bleedTurns: 0,
            shield: 0,
            frozen: false
        },
        logs: [
            '❤️ Poção de Vida restaurou 70 HP e encheu sua vida.'
        ]
    };

    const text = renderFightCaptionSafe(fight, 3);

    assert.match(text, /BATALHA/);
    assert.match(text, /120\/120/);
    assert.match(text, /Poção de Vida restaurou/);
    assert.match(text, /Lobo Sombrio/);
});
