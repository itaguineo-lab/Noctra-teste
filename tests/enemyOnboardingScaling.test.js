const test = require('node:test');
const assert = require('node:assert/strict');

const {
    enemyPools,
    getRandomEnemy,
    _internals
} = require('../src/core/world/enemies');

const { applyOnboardingScaling, scaleEnemyForPlayer } = _internals;

function withMockedRandom(sequence, fn) {
    const original = Math.random;
    let index = 0;

    Math.random = () => {
        const value = sequence[Math.min(index, sequence.length - 1)];
        index += 1;
        return value;
    };

    try {
        return fn();
    } finally {
        Math.random = original;
    }
}

test('level 1 na Clareira reduz hp/atk/def de enemy common', () => {
    const base = enemyPools.clareira_sombria.common[0];
    const scaled = scaleEnemyForPlayer(base, 1, 'clareira_sombria');
    const reduced = applyOnboardingScaling({ ...scaled }, 1, 'clareira_sombria');

    assert.ok(reduced.hp < scaled.hp);
    assert.ok(reduced.atk < scaled.atk);
    assert.ok(reduced.def < scaled.def);
    assert.equal(reduced.xp, scaled.xp);
    assert.equal(reduced.gold, scaled.gold);
    assert.deepEqual(reduced.ability, scaled.ability);
});

test('level 3 na Clareira reduz menos que level 1', () => {
    const base = enemyPools.clareira_sombria.common[0];
    const scaledL1 = scaleEnemyForPlayer(base, 1, 'clareira_sombria');
    const scaledL3 = scaleEnemyForPlayer(base, 3, 'clareira_sombria');

    const reducedL1 = applyOnboardingScaling({ ...scaledL1 }, 1, 'clareira_sombria');
    const reducedL3 = applyOnboardingScaling({ ...scaledL3 }, 3, 'clareira_sombria');

    assert.ok(reducedL3.hp / scaledL3.hp > reducedL1.hp / scaledL1.hp);
    assert.ok(reducedL3.atk / scaledL3.atk > reducedL1.atk / scaledL1.atk);
    assert.ok(reducedL3.def / Math.max(1, scaledL3.def) > reducedL1.def / Math.max(1, scaledL1.def));
});

test('level 4 na Clareira não aplica redução de onboarding', () => {
    const base = enemyPools.clareira_sombria.common[0];
    const scaled = scaleEnemyForPlayer(base, 4, 'clareira_sombria');
    const result = applyOnboardingScaling({ ...scaled }, 4, 'clareira_sombria');

    assert.deepEqual(result, scaled);
});

test('elite/miniboss/boss não recebem redução de onboarding', () => {
    const elite = applyOnboardingScaling(
        scaleEnemyForPlayer(enemyPools.clareira_sombria.elite[0], 1, 'clareira_sombria'),
        1,
        'clareira_sombria'
    );
    const miniboss = applyOnboardingScaling(
        scaleEnemyForPlayer(enemyPools.clareira_sombria.miniboss[0], 1, 'clareira_sombria'),
        1,
        'clareira_sombria'
    );
    const boss = applyOnboardingScaling(
        scaleEnemyForPlayer(enemyPools.clareira_sombria.boss[0], 1, 'clareira_sombria'),
        1,
        'clareira_sombria'
    );

    assert.equal(elite.isElite, true);
    assert.equal(miniboss.isMiniBoss, true);
    assert.equal(boss.isBoss, true);
});

test('outros mapas não recebem redução de onboarding', () => {
    const base = enemyPools.cripta_em_ruinas.common[0];
    const scaled = scaleEnemyForPlayer(base, 1, 'cripta_em_ruinas');
    const result = applyOnboardingScaling({ ...scaled }, 1, 'cripta_em_ruinas');

    assert.deepEqual(result, scaled);
});

test('getRandomEnemy mantém xp e gold para common no onboarding', () => {
    const enemy = withMockedRandom([0.9, 0], () => getRandomEnemy('clareira_sombria', 1, 0));
    const base = enemyPools.clareira_sombria.common.find((e) => e.id === enemy.id);

    assert.ok(enemy.hp < base.hp);
    assert.ok(enemy.atk < base.atk);
    assert.ok(enemy.def <= base.def);
    assert.equal(enemy.xp, base.xp);
    assert.equal(enemy.gold, base.gold);
    assert.equal(Boolean(enemy.isElite), false);
    assert.equal(Boolean(enemy.isMiniBoss), false);
    assert.equal(Boolean(enemy.isBoss), false);
});
