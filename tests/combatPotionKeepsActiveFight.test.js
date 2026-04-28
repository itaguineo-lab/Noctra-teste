const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    shouldSkipEnemyTurnForConsumable,
    syncPlayerFromFight
} = combatFixed.__private;

test('poção HP e energia continuam sem contra-ataque imediato', () => {
    assert.equal(shouldSkipEnemyTurnForConsumable('potionHp'), true);
    assert.equal(shouldSkipEnemyTurnForConsumable('potionEnergy'), true);
});

test('syncPlayerFromFight copia HP curado sem alterar estrutura de luta', () => {
    const player = {
        hp: 10,
        maxHp: 242,
        energy: 10,
        maxEnergy: 20
    };

    const fight = {
        status: 'ongoing',
        player: {
            hp: 242,
            maxHp: 242,
            energy: 10,
            maxEnergy: 20
        }
    };

    syncPlayerFromFight(player, fight);

    assert.equal(player.hp, 242);
    assert.equal(player.energy, 10);
    assert.equal(fight.status, 'ongoing');
});
