const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getXpToNextLevel,
    getLevelUpRewards,
    checkLevelUp
} = require('../src/core/player/progression');

const { enemyPools } = require('../src/core/world/enemies');
const { sampleSpawnTiers, getAverageMapCommonGold, getAverageMapCommonXp } = require('../src/core/balance/balanceDiagnostics');

function sumXpUntilLevel(targetLevel) {
    let total = 0;
    for (let level = 1; level < targetLevel; level += 1) {
        total += getXpToNextLevel(level);
    }
    return total;
}

function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function makePlayer(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Tester',
        class: 'guerreiro',
        level: 1,
        xp: 0,
        hp: 120,
        maxHp: 120,
        maxEnergy: 20,
        energy: 0,
        gold: 0,
        glorias: 0,
        keys: 0,
        inventory: [],
        equipment: {},
        soulsEquipped: [null, null],
        consumables: {},
        ...overrides
    };
}

test('curva de XP inicial acelera tração até o nível 4 sem pular demais', () => {
    assert.deepEqual(
        [1, 2, 3, 4].map(getXpToNextLevel),
        [75, 105, 135, 165]
    );

    assert.equal(sumXpUntilLevel(5), 480);
    assert.ok(sumXpUntilLevel(5) <= 520, 'nível 5 deve ser alcançável cedo');
});

test('curva de XP mantém nível 8 como conquista antes da Cripta', () => {
    assert.deepEqual(
        [5, 6, 7, 8].map(getXpToNextLevel),
        [180, 225, 270, 315]
    );

    assert.equal(sumXpUntilLevel(8), 1155);
    assert.equal(sumXpUntilLevel(9), 1470);
    assert.ok(sumXpUntilLevel(8) >= 1000, 'nível 8 não pode ser instantâneo');
    assert.ok(sumXpUntilLevel(8) <= 1300, 'nível 8 não pode demorar demais no começo');
});

test('level up inicial restaura energia suficiente para prolongar sessão', () => {
    const player = makePlayer({ xp: getXpToNextLevel(1), energy: 0 });
    const result = checkLevelUp(player);

    assert.equal(result.leveledUp, true);
    assert.equal(player.level, 2);
    assert.equal(result.energyRestored, 6);
    assert.equal(player.energy, 6);
    assert.ok(result.healAmount >= 50);
});

test('recompensas de level up inicial não entregam chave cedo demais', () => {
    for (let level = 2; level <= 8; level += 1) {
        const rewards = getLevelUpRewards({ level });
        assert.equal(rewards.energyRestore, 6);
        assert.equal(rewards.keys, 0, `nível ${level} não deve entregar chave`);
    }

    assert.equal(getLevelUpRewards({ level: 5 }).glorias, 1);
});

test('comuns da Clareira são leves o suficiente para onboarding', () => {
    const common = enemyPools.clareira_sombria.common;
    const avgHp = average(common.map(enemy => enemy.hp));
    const avgAtk = average(common.map(enemy => enemy.atk));
    const avgDef = average(common.map(enemy => enemy.def));

    assert.ok(avgHp <= 40, `HP médio comum da Clareira alto demais: ${avgHp}`);
    assert.ok(avgAtk <= 8, `ATK médio comum da Clareira alto demais: ${avgAtk}`);
    assert.ok(avgDef <= 2.2, `DEF média comum da Clareira alta demais: ${avgDef}`);
    assert.ok(getAverageMapCommonGold('clareira_sombria') < 30);
    assert.ok(getAverageMapCommonXp('clareira_sombria') < 40);
});

test('elite e miniboss da Clareira continuam ameaçadores sem virar parede inicial', () => {
    const eliteAvgHp = average(enemyPools.clareira_sombria.elite.map(enemy => enemy.hp));
    const eliteAvgAtk = average(enemyPools.clareira_sombria.elite.map(enemy => enemy.atk));
    const mini = enemyPools.clareira_sombria.miniboss[0];
    const boss = enemyPools.clareira_sombria.boss[0];

    assert.ok(eliteAvgHp >= 75 && eliteAvgHp <= 95);
    assert.ok(eliteAvgAtk >= 12 && eliteAvgAtk <= 16);
    assert.ok(mini.hp <= 140);
    assert.ok(boss.hp <= 200);
});

test('Cripta de entrada está mais difícil que Clareira sem salto absurdo', () => {
    const clareiraCommonHp = average(enemyPools.clareira_sombria.common.map(enemy => enemy.hp));
    const criptaCommonHp = average(enemyPools.cripta_em_ruinas.common.map(enemy => enemy.hp));
    const clareiraCommonAtk = average(enemyPools.clareira_sombria.common.map(enemy => enemy.atk));
    const criptaCommonAtk = average(enemyPools.cripta_em_ruinas.common.map(enemy => enemy.atk));

    assert.ok(criptaCommonHp > clareiraCommonHp * 1.8);
    assert.ok(criptaCommonHp < clareiraCommonHp * 2.8);
    assert.ok(criptaCommonAtk > clareiraCommonAtk * 1.6);
    assert.ok(criptaCommonAtk < clareiraCommonAtk * 2.4);
});

test('spawn inicial continua protegido depois do ajuste de balanceamento', () => {
    for (const level of [1, 2, 3, 4]) {
        const sample = sampleSpawnTiers('clareira_sombria', level, 500, 18000 + level);
        assert.equal(sample.counts.common, 500);
        assert.equal(sample.counts.elite, 0);
        assert.equal(sample.counts.miniboss, 0);
        assert.equal(sample.counts.boss, 0);
    }

    const level7 = sampleSpawnTiers('clareira_sombria', 7, 800, 19007);
    assert.equal(level7.counts.boss, 0);
    assert.ok(level7.rates.common >= 0.82);
});
