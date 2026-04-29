const test = require('node:test');
const assert = require('node:assert/strict');

const { ENEMY_ABILITIES } = require('../src/core/world/enemies');

function makeFight() {
    return {
        logs: [],
        player: {
            stunned: false
        },
        enemy: {
            name: 'Aranha da Floresta',
            hp: 40,
            maxHp: 40,
            poisonTurns: 0,
            bleedTurns: 0,
            shield: 0
        }
    };
}

function assertCleanLog(text) {
    assert.doesNotMatch(text, /\*/);
    assert.doesNotMatch(text, /!/);
    assert.doesNotMatch(text, /\\/);
    assert.doesNotMatch(text, /\.$/m);
}

test('logs diretos de habilidades inimigas não deixam barra ou ponto final escapável', () => {
    const fight = makeFight();

    ENEMY_ABILITIES.POISON.apply(fight.enemy, fight);
    ENEMY_ABILITIES.BLEED.apply(fight.enemy, fight);
    ENEMY_ABILITIES.STUN.apply(fight.player, fight);
    ENEMY_ABILITIES.SHIELD.apply(fight.enemy, fight);
    ENEMY_ABILITIES.HEAL.apply(fight.enemy, fight);

    const text = fight.logs.join('\n');

    assert.match(text, /foi envenenado/);
    assert.match(text, /está sangrando/);
    assert.match(text, /atordoou você/);
    assert.match(text, /ergueu um escudo sombrio/);
    assert.match(text, /se regenerou em \d+ HP/);
    assertCleanLog(text);
});

test('ticks de veneno e sangramento inimigo também ficam limpos', () => {
    const fight = makeFight();
    fight.enemy.poisonTurns = 1;
    fight.enemy.bleedTurns = 1;

    ENEMY_ABILITIES.POISON.tick(fight.enemy, fight);
    ENEMY_ABILITIES.BLEED.tick(fight.enemy, fight);

    const text = fight.logs.join('\n');

    assert.match(text, /Veneno causa \d+ de dano/);
    assert.match(text, /Sangramento causa \d+ de dano/);
    assertCleanLog(text);
});
