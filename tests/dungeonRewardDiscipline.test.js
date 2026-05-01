const test = require('node:test');
const assert = require('node:assert/strict');

const { BALANCE } = require('../src/data/balance');

const {
    getCompletionMinRarity,
    getCompletionRarityBias,
    buildCompletionRewardTag
} = require('../src/core/dungeon/dungeonRewardPolicy');

test('dungeon boss soul chance segue regra oficial de 8%', () => {
    assert.equal(BALANCE.souls.dungeonBossDropChance, 0.08);
});

test('dungeon comum da Clareira tem piso Incomum para evitar banalizar Raro no early game', () => {
    assert.equal(getCompletionMinRarity(1, false), 'Incomum');
    assert.equal(buildCompletionRewardTag(1, false), 'Comum • mínimo Incomum');
});

test('dungeons comuns preservam progressão de raridade por mapa', () => {
    assert.equal(getCompletionMinRarity(2, false), 'Raro');
    assert.equal(getCompletionMinRarity(3, false), 'Raro');
    assert.equal(getCompletionMinRarity(4, false), 'Épico');
    assert.equal(getCompletionMinRarity(5, false), 'Épico');
    assert.equal(getCompletionMinRarity(6, false), 'Lendário');
});

test('dungeon comum da Clareira usa bias early_boss e não mid_boss', () => {
    assert.equal(getCompletionRarityBias(1, false), 'early_boss');
    assert.equal(getCompletionRarityBias(2, false), 'mid_boss');
});

test('dungeon elite mantém recompensa premium desde a Clareira', () => {
    assert.equal(getCompletionMinRarity(1, true), 'Épico');
    assert.equal(buildCompletionRewardTag(1, true), 'Elite • mínimo Épico');
});
