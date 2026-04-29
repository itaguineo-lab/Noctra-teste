const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    isEliteDungeonRun,
    buildDungeonDropPolicy
} = require('../src/core/dungeon/dungeonRewards');

const dungeonRewardsPath = path.join(__dirname, '..', 'src', 'core', 'dungeon', 'dungeonRewards.js');

test('dungeon comum não é tratada como Dungeon Elite', () => {
    const player = {
        dungeonProgress: {
            mapId: 'clareira_sombria',
            mode: 'normal',
            difficulty: 'normal'
        }
    };

    assert.equal(isEliteDungeonRun(player), false);
    assert.deepEqual(buildDungeonDropPolicy(player), {
        isDungeon: true,
        isEliteDungeon: false
    });
});

test('Dungeon Elite é reconhecida por flag explícita', () => {
    const player = {
        dungeonProgress: {
            mapId: 'cripta_em_ruinas',
            isEliteDungeon: true
        }
    };

    assert.equal(isEliteDungeonRun(player), true);
    assert.deepEqual(buildDungeonDropPolicy(player), {
        isDungeon: true,
        isEliteDungeon: true
    });
});

test('Dungeon Elite é reconhecida por mode ou difficulty', () => {
    assert.equal(isEliteDungeonRun({ dungeonProgress: { mode: 'elite' } }), true);
    assert.equal(isEliteDungeonRun({ dungeonProgress: { difficulty: 'elite' } }), true);
});

test('dungeonRewards usa política centralizada de loot', () => {
    const source = fs.readFileSync(dungeonRewardsPath, 'utf8');

    assert.match(source, /generatePolicyCompliantDrop/);
    assert.doesNotMatch(source, /require\('\.\.\/\.\.\/data\/itemsV2'\)/);
    assert.doesNotMatch(source, /const \{ generateDrop \}/);
});
