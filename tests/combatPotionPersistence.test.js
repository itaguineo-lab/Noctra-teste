const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    syncPlayerFromFight,
    preventStaleActiveFightOverwrite
} = combatFixed.__private;

test('syncPlayerFromFight sincroniza HP e energia do estado da luta para o player', () => {
    const player = {
        hp: 10,
        maxHp: 120,
        energy: 5,
        maxEnergy: 20
    };

    const fight = {
        player: {
            hp: 120,
            maxHp: 120,
            energy: 18,
            maxEnergy: 20
        }
    };

    syncPlayerFromFight(player, fight);

    assert.equal(player.hp, 120);
    assert.equal(player.energy, 18);
});

test('syncPlayerFromFight nunca passa do maxHp/maxEnergy do player', () => {
    const player = {
        hp: 10,
        maxHp: 100,
        energy: 5,
        maxEnergy: 10
    };

    const fight = {
        player: {
            hp: 999,
            maxHp: 999,
            energy: 999,
            maxEnergy: 999
        }
    };

    syncPlayerFromFight(player, fight);

    assert.equal(player.hp, 100);
    assert.equal(player.energy, 10);
});

test('preventStaleActiveFightOverwrite remove activeFight antigo antes de salvar player', () => {
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
