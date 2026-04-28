const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createFight,
    useSoul,
    processPlayerTurn,
    applyDefend,
    getSoulCooldownRemaining,
    tickSoulCooldowns
} = require('../src/core/combat/combatEngine');

const {
    getSoulCooldownTurns,
    isPassiveSoul
} = require('../src/core/player/souls');

function player(overrides = {}) {
    return {
        id: '1',
        name: 'Admin',
        class: 'guerreiro',
        level: 10,
        hp: 120,
        maxHp: 120,
        atk: 30,
        def: 10,
        crit: 0,
        energy: 20,
        maxEnergy: 20,
        soulsEquipped: [
            {
                id: 'soul_wolf',
                instanceId: 'uuid-wolf',
                name: 'Alma do Lobo Sombrio',
                rarity: 'Raro',
                tier: 1,
                emoji: '🐺',
                cooldownTurns: 3,
                effect: {
                    type: 'damage',
                    multiplier: 1.35
                }
            },
            null
        ],
        ...overrides
    };
}

function enemy(overrides = {}) {
    return {
        id: 'enemy_test',
        name: 'Inimigo Teste',
        hp: 300,
        atk: 1,
        def: 0,
        crit: 0,
        level: 1,
        xp: 1,
        gold: 1,
        ...overrides
    };
}

test('getSoulCooldownTurns usa cooldown explícito ou fallback por tipo', () => {
    assert.equal(getSoulCooldownTurns({ cooldownTurns: 2 }), 2);
    assert.equal(getSoulCooldownTurns({ effect: { type: 'damage' } }), 3);
    assert.equal(getSoulCooldownTurns({ effect: { type: 'heal' } }), 4);
    assert.equal(getSoulCooldownTurns({ effect: { type: 'passive' } }), 0);
});

test('isPassiveSoul identifica alma passiva', () => {
    assert.equal(isPassiveSoul({ effect: { type: 'passive' } }), true);
    assert.equal(isPassiveSoul({ effect: { type: 'damage' } }), false);
});

test('useSoul aplica efeito e coloca cooldown no slot usado', () => {
    const fight = createFight(player(), enemy());
    const result = useSoul(fight, 0);

    assert.equal(result.success, true);
    assert.equal(getSoulCooldownRemaining(fight, 0), 3);
    assert.match(fight.logs.join('\n'), /recarga por 3 turnos/);
});

test('useSoul bloqueia alma em cooldown sem causar novo dano', () => {
    const fight = createFight(player(), enemy());

    useSoul(fight, 0);
    const hpAfterFirstUse = fight.enemy.hp;
    const result = useSoul(fight, 0);

    assert.equal(result.success, false);
    assert.equal(result.cooldown, 3);
    assert.equal(fight.enemy.hp, hpAfterFirstUse);
    assert.match(fight.logs.join('\n'), /recarrega em 3 turno/);
});

test('processPlayerTurn reduz cooldown da alma', () => {
    const fight = createFight(player(), enemy());

    useSoul(fight, 0);
    assert.equal(getSoulCooldownRemaining(fight, 0), 3);

    processPlayerTurn(fight);
    assert.equal(getSoulCooldownRemaining(fight, 0), 2);
});

test('applyDefend também reduz cooldown', () => {
    const fight = createFight(player(), enemy());

    useSoul(fight, 0);
    applyDefend(fight);

    assert.equal(getSoulCooldownRemaining(fight, 0), 2);
});

test('tickSoulCooldowns nunca deixa cooldown negativo', () => {
    const fight = createFight(player(), enemy());
    fight.player.soulCooldowns = [1, 0];

    tickSoulCooldowns(fight);
    tickSoulCooldowns(fight);

    assert.deepEqual(fight.player.soulCooldowns, [0, 0]);
});

test('alma passiva não é ativável em combate', () => {
    const passivePlayer = player({
        soulsEquipped: [
            {
                id: 'soul_guardian',
                instanceId: 'uuid-guardian',
                name: 'Alma Guardiã',
                rarity: 'Épico',
                tier: 2,
                emoji: '🛡️',
                effect: {
                    type: 'passive',
                    defBonus: 10,
                    hpBonus: 30
                }
            },
            null
        ]
    });

    const fight = createFight(passivePlayer, enemy());
    const result = useSoul(fight, 0);

    assert.equal(result.success, false);
    assert.equal(result.passive, true);
    assert.match(fight.logs.join('\n'), /passiva/);
});
