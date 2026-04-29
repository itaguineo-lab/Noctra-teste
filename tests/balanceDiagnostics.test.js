const test = require('node:test');
const assert = require('node:assert/strict');

const diagnostics = require('../src/core/balance/balanceDiagnostics');
const { BALANCE } = require('../src/data/balance');
const { maps } = require('../src/core/world/maps');
const { enemyPools } = require('../src/core/world/enemies');

const {
    runBalanceDiagnostics,
    formatDiagnosticsReport,
    sampleSpawnTiers,
    getMapEnemyStats,
    getRarityTotalWeight,
    getAverageMapCommonGold,
    getAverageMapCommonXp,
    getPremiumItems,
    getArenaGloriaItems,
    checkEnergyEconomy,
    checkMapProgression,
    checkEarlyGameSpawnProtection,
    checkNoxAndShopRules,
    checkArenaEconomy
} = diagnostics;

function expectNoFailures(checks) {
    const failures = checks.filter(check => check.status === 'fail');
    assert.deepEqual(failures, []);
}

test('diagnóstico geral roda sem falhas fatais', () => {
    const report = runBalanceDiagnostics();

    assert.equal(report.ok, true, formatDiagnosticsReport(report));
    assert.equal(report.failures.length, 0);
    assert.ok(report.summary.total > 20);
    assert.ok(report.summary.pass > 0);
    assert.ok(report.snapshots.earlyGame);
    assert.ok(report.snapshots.maps.length >= 4);
});

test('regras fixas de energia continuam protegidas', () => {
    expectNoFailures(checkEnergyEconomy());

    assert.equal(BALANCE.energy.baseMax, 20);
    assert.equal(BALANCE.energy.vipMax, 40);
    assert.equal(BALANCE.energy.huntCost, 1);
    assert.equal(BALANCE.energy.dungeonEntryKeyCost, 1);
    assert.equal(BALANCE.energy.vipRegenMinutes < BALANCE.energy.baseRegenMinutes, true);
});

test('progressão de mapas está crescente e Cripta abre no nível 8', () => {
    expectNoFailures(checkMapProgression());

    const levelReqs = maps.map(map => map.levelReq);
    const lootTiers = maps.map(map => map.lootTier);

    assert.deepEqual(levelReqs, [1, 8, 15, 24, 32, 42]);
    assert.deepEqual(lootTiers, [1, 2, 3, 4, 5, 6]);
});

test('todos os mapas possuem pools válidos de inimigos', () => {
    for (const map of maps) {
        const pool = enemyPools[map.id];
        assert.ok(pool, `pool ausente: ${map.id}`);
        assert.ok(pool.common?.length > 0, `common ausente: ${map.id}`);

        const stats = getMapEnemyStats(map.id);
        assert.ok(stats.count > 0);
        assert.ok(stats.tiers.common.avgHp > 0);
        assert.ok(stats.tiers.common.avgXp > 0);
        assert.ok(stats.tiers.common.avgGold > 0);
    }
});

test('onboarding protege níveis 1 a 4 de elite, miniboss e boss', () => {
    expectNoFailures(checkEarlyGameSpawnProtection());

    for (const level of [1, 2, 3, 4]) {
        const sample = sampleSpawnTiers('clareira_sombria', level, 500, 9000 + level);

        assert.equal(sample.counts.elite, 0, `elite apareceu no nível ${level}`);
        assert.equal(sample.counts.miniboss, 0, `miniboss apareceu no nível ${level}`);
        assert.equal(sample.counts.boss, 0, `boss apareceu no nível ${level}`);
        assert.equal(sample.counts.common, 500);
    }
});

test('níveis 5 a 7 ainda não recebem boss na Clareira', () => {
    for (const level of [5, 6, 7]) {
        const sample = sampleSpawnTiers('clareira_sombria', level, 800, 10000 + level);

        assert.equal(sample.counts.boss, 0, `boss apareceu no nível ${level}`);
        assert.ok(sample.rates.common >= 0.82, `common baixo demais no nível ${level}: ${sample.rates.common}`);
    }
});

test('Cripta no nível 8 já tem variedade de encontros', () => {
    const sample = sampleSpawnTiers('cripta_em_ruinas', 8, 1000, 12000);

    assert.ok(sample.counts.common > 0);
    assert.ok(sample.counts.elite > 0);
    assert.ok(sample.counts.miniboss > 0);
    assert.ok(sample.counts.boss > 0);
});

test('economia de alma e chave está em faixas controladas', () => {
    const report = runBalanceDiagnostics();

    assert.equal(report.failures.find(check => check.id.startsWith('souls.')), undefined);
    assert.equal(report.failures.find(check => check.id.startsWith('dungeon.')), undefined);

    assert.ok(BALANCE.souls.dungeonBossDropChance > BALANCE.souls.fieldBossDropChance);
    assert.ok(BALANCE.dungeon.fieldBossKeyDropChance > BALANCE.dungeon.fieldMiniBossKeyDropChance);
    assert.equal(BALANCE.dungeon.dungeonCompletionKeyReward, 0);
});

test('Nox não vende alma, chave ou equipamento diretamente', () => {
    expectNoFailures(checkNoxAndShopRules());

    const premiumItems = getPremiumItems();
    const forbidden = premiumItems.filter(item => {
        const text = `${item.id} ${item.name} ${item.type} ${item.effect || ''}`.toLowerCase();
        return text.includes('soul') || text.includes('alma') || text.includes('key') || text.includes('chave') || item.type === 'equipment';
    });

    assert.deepEqual(forbidden, []);
});

test('loja de Glórias e baús de arena têm configuração válida', () => {
    expectNoFailures(checkArenaEconomy());

    const gloriaItems = getArenaGloriaItems();
    assert.ok(gloriaItems.length > 0);
    assert.ok(gloriaItems.every(item => item.price > 0));
});

test('raridades e economia inicial têm valores mensuráveis', () => {
    assert.equal(getRarityTotalWeight(), 100);

    const avgGold = getAverageMapCommonGold('clareira_sombria');
    const avgXp = getAverageMapCommonXp('clareira_sombria');

    assert.ok(avgGold > 0);
    assert.ok(avgXp > 0);
    assert.ok(avgGold < 30, `ouro comum inicial alto demais: ${avgGold}`);
    assert.ok(avgXp < 40, `XP comum inicial alto demais: ${avgXp}`);
});

test('relatório formatado mostra resumo útil', () => {
    const report = runBalanceDiagnostics();
    const text = formatDiagnosticsReport(report);

    assert.match(text, /BALANCE DIAGNOSTICS/);
    assert.match(text, /Checks:/);
    assert.match(text, /pass/);
});
