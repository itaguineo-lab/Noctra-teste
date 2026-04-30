const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ensureArenaState,
    buildArenaHubText,
    openArenaChest,
    resolveArenaVictory,
    ARENA_CHEST_CONFIG
} = require('../src/core/arena/arenaService');

function basePlayer(overrides = {}) {
    return {
        id: '1',
        name: 'Admin',
        level: 10,
        atk: 40,
        def: 20,
        maxHp: 200,
        hp: 200,
        crit: 5,
        gold: 0,
        glorias: 0,
        keys: 0,
        consumables: {},
        arena: {
            points: 0,
            coins: 0,
            wins: 0,
            losses: 0,
            streak: 0,
            maxStreak: 0,
            chests: [],
            leagueId: 'bronze'
        },
        ...overrides
    };
}

function baseBattle(overrides = {}) {
    return {
        enemy: {
            id: 'enemy',
            name: 'Eco Sombrio',
            leagueId: 'bronze',
            power: 500
        },
        player: {
            hp: 120,
            maxHp: 120
        },
        totalDamageDealt: 100,
        ...overrides
    };
}

test('buildArenaHubText mostra Glórias e não Moedas da Arena', () => {
    const player = basePlayer({
        glorias: 12,
        arena: {
            points: 100,
            coins: 0,
            wins: 2,
            losses: 1,
            streak: 1,
            maxStreak: 2,
            chests: [],
            leagueId: 'bronze'
        }
    });

    const text = buildArenaHubText(player);

    assert.match(text, /🏅 Glórias: \*?12\*?/);
    assert.doesNotMatch(text, /Moedas da Arena/i);
    assert.doesNotMatch(text, /🪙 Moedas/i);
});

test('ensureArenaState mantém coins apenas como legado interno', () => {
    const player = basePlayer({
        glorias: 5,
        arena: { coins: 9 }
    });

    ensureArenaState(player);

    assert.equal(player.glorias, 5);
    assert.equal(player.arena.coins, 9);
});

test('resolveArenaVictory entrega Glórias e não aumenta arena.coins', () => {
    const player = basePlayer({ glorias: 0 });
    const battle = baseBattle();

    const rewards = resolveArenaVictory(player, battle);

    assert.equal(rewards.gloriasGained >= 1, true);
    assert.equal(rewards.coinsGained, rewards.gloriasGained);
    assert.equal(player.glorias, rewards.gloriasGained);
    assert.equal(player.arena.coins, 0);
});

test('resolveArenaVictory com slots cheios dá overflow em Glórias', () => {
    const player = basePlayer({
        glorias: 0,
        arena: {
            points: 0,
            coins: 0,
            wins: 0,
            losses: 0,
            streak: 0,
            maxStreak: 0,
            leagueId: 'bronze',
            chests: [
                { id: 'a', tier: 'wood' },
                { id: 'b', tier: 'wood' },
                { id: 'c', tier: 'wood' }
            ]
        }
    });

    const rewards = resolveArenaVictory(player, baseBattle());

    assert.equal(rewards.chest, null);
    assert.equal(rewards.overflowGlorias >= 1, true);
    assert.equal(rewards.overflowCoins, rewards.overflowGlorias);
    assert.equal(player.glorias, rewards.gloriasGained + rewards.overflowGlorias);
    assert.equal(player.arena.coins, 0);
});

test('openArenaChest entrega Glórias em vez de arena.coins', () => {
    const now = Date.now();
    const player = basePlayer({
        glorias: 0,
        arena: {
            points: 0,
            coins: 0,
            wins: 0,
            losses: 0,
            streak: 0,
            maxStreak: 0,
            leagueId: 'bronze',
            chests: [
                {
                    id: 'chest1',
                    tier: 'wood',
                    name: 'Baú de Madeira',
                    readyAt: now - 1000,
                    createdAt: now - 2000
                }
            ]
        }
    });

    const result = openArenaChest(player, 'chest1');

    assert.equal(result.success, true);
    assert.equal(result.rewards.glorias >= ARENA_CHEST_CONFIG.wood.glorias[0], true);
    assert.equal(result.rewards.glorias <= ARENA_CHEST_CONFIG.wood.glorias[1] + 1, true);
    assert.equal(result.rewards.arenaCoins, 0);
    assert.equal(player.glorias, result.rewards.glorias);
    assert.equal(player.arena.coins, 0);
});
