const test = require('node:test');
const assert = require('node:assert/strict');

const { processVictory } = require('../src/services/rewardService');

function buildPlayer(overrides = {}) {
    return {
        id: 'reward-test-player',
        name: 'Caçador Teste',
        class: 'guerreiro',
        level: 1,
        xp: 0,
        hp: 120,
        maxHp: 120,
        atk: 12,
        def: 10,
        crit: 5,
        gold: 100,
        nox: 7,
        glorias: 0,
        keys: 0,
        vip: false,
        vipExpires: null,
        energy: 20,
        maxEnergy: 20,
        lastEnergyUpdate: new Date(),
        inventory: [],
        maxInventory: 20,
        bonusInventory: 0,
        equipment: {
            weapon: null,
            shield: null,
            armor: null,
            necklace: null,
            ring: null,
            boots: null
        },
        consumables: {
            potionHp: 0,
            potionEnergy: 0,
            tonicStrength: 0,
            tonicDefense: 0
        },
        buffs: [],
        soulsInventory: [],
        soulsEquipped: [null, null],
        cosmetics: [],
        activeCosmetics: {
            title: null,
            aura: null,
            badge: null
        },
        currentMap: 'clareira_sombria',
        dungeonProgress: null,
        lastDungeonRun: 0,
        soulPityCounter: 0,
        arena: null,
        totalKills: 0,
        achievements: {},
        activeFight: null,
        activeArenaBattle: null,
        ...overrides
    };
}

function buildEnemy(overrides = {}) {
    return {
        id: 'reward_test_enemy',
        name: 'Inimigo de Teste',
        hp: 10,
        maxHp: 10,
        atk: 1,
        def: 0,
        crit: 0,
        xp: 10,
        gold: 5,
        ...overrides
    };
}

async function withForcedRandom(value, fn) {
    const originalRandom = Math.random;
    Math.random = () => value;

    try {
        return await fn();
    } finally {
        Math.random = originalRandom;
    }
}

test('processVictory preserva NOX em vitória comum de campo', async () => {
    await withForcedRandom(0.99, async () => {
        const player = buildPlayer({ nox: 7 });
        const enemy = buildEnemy();

        const rewards = await processVictory(player, enemy);

        assert.equal(player.nox, 7);
        assert.equal(rewards.gold, 5);
        assert.equal(rewards.xp, 10);
        assert.equal(rewards.metricSource, 'field');
    });
});

test('processVictory preserva NOX em elite, miniboss e boss de campo', async () => {
    const cases = [
        { isElite: true },
        { isMiniBoss: true },
        { isBoss: true }
    ];

    for (const flags of cases) {
        await withForcedRandom(0.99, async () => {
            const player = buildPlayer({ nox: 11 });
            const enemy = buildEnemy(flags);

            await processVictory(player, enemy);

            assert.equal(player.nox, 11, `NOX alterado indevidamente para ${JSON.stringify(flags)}`);
        });
    }
});
