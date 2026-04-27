const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    shouldSkipEnemyTurnForConsumable,
    syncPlayerFromFight,
    preventStaleActiveFightOverwrite
} = combatFixed.__private;

test('poções de HP e energia não devem consumir contra-ataque inimigo imediato', () => {
    assert.equal(shouldSkipEnemyTurnForConsumable('potionHp'), true);
    assert.equal(shouldSkipEnemyTurnForConsumable('potionEnergy'), true);
});

test('tônicos continuam consumindo turno de combate', () => {
    assert.equal(shouldSkipEnemyTurnForConsumable('tonicStrength'), false);
    assert.equal(shouldSkipEnemyTurnForConsumable('tonicDefense'), false);
});

test('syncPlayerFromFight sincroniza HP curado da luta para o player', () => {
    const player = {
        hp: 12,
        maxHp: 120,
        energy: 5,
        maxEnergy: 20
    };

    const fight = {
        player: {
            hp: 120,
            maxHp: 120,
            energy: 5,
            maxEnergy: 20
        }
    };

    syncPlayerFromFight(player, fight);

    assert.equal(player.hp, 120);
    assert.equal(player.energy, 5);
});

test('preventStaleActiveFightOverwrite impede salvar activeFight antigo', () => {
    const player = {
        activeFight: {
            payload: {
                player: {
                    hp: 12
                }
            }
        }
    };

    preventStaleActiveFightOverwrite(player);
    assert.equal(player.activeFight, null);
});
