const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getCompletionMinRarity,
    getCompletionRarityBias,
    buildCompletionDropOptions,
    buildCompletionDropPolicy,
    getCompletionBonus,
    buildCompletionRewardTag
} = require('../src/core/dungeon/dungeonRewardPolicy');

const {
    getRarityRank,
    isRarityAtLeast,
    generateDungeonCompletionDrop,
    finalizeDungeonRun
} = require('../src/core/dungeon/dungeonRewards');

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Tester',
        class: 'guerreiro',
        level: 10,
        hp: 120,
        maxHp: 120,
        atk: 30,
        def: 12,
        crit: 5,
        gold: 0,
        xp: 0,
        keys: 0,
        glorias: 0,
        inventory: [],
        maxInventory: 30,
        consumables: {},
        soulsInventory: [],
        soulsEquipped: [null, null],
        missions: {},
        dungeonProgress: {
            active: true,
            completed: false,
            aborted: false,
            mapId: 'clareira_sombria',
            currentRoomIndex: 4,
            maxRooms: 5,
            rooms: [
                { cleared: true },
                { cleared: true },
                { cleared: true },
                { cleared: true },
                { cleared: true, type: 'boss' }
            ],
            rewards: { xp: 10, gold: 20, keys: 0, glorias: 0, items: 0, souls: 0 },
            summary: null,
            logs: [],
            combatBonus: { atk: 0, def: 0, crit: 0 },
            ...overrides.dungeonProgress
        },
        ...overrides
    };
}

test('política define raridade mínima por mapa para dungeon comum', () => {
    assert.equal(getCompletionMinRarity(1, false), 'Incomum');
    assert.equal(getCompletionMinRarity(2, false), 'Raro');
    assert.equal(getCompletionMinRarity(3, false), 'Raro');
    assert.equal(getCompletionMinRarity(4, false), 'Épico');
    assert.equal(getCompletionMinRarity(6, false), 'Lendário');
});

test('política define raridade mínima superior para dungeon elite', () => {
    assert.equal(getCompletionMinRarity(1, true), 'Épico');
    assert.equal(getCompletionMinRarity(3, true), 'Épico');
    assert.equal(getCompletionMinRarity(4, true), 'Lendário');
    assert.equal(getCompletionMinRarity(6, true), 'Lendário');
});

test('rarity bias da recompensa final escala por mapa e elite', () => {
    assert.equal(getCompletionRarityBias(1, false), 'early_boss');
    assert.equal(getCompletionRarityBias(2, false), 'mid_boss');
    assert.equal(getCompletionRarityBias(4, false), 'late_boss');
    assert.equal(getCompletionRarityBias(6, false), 'endgame_boss');
    assert.equal(getCompletionRarityBias(1, true), 'mid_boss');
    assert.equal(getCompletionRarityBias(4, true), 'late_boss');
});

test('buildCompletionDropOptions mantém classe do jogador e encounter boss', () => {
    assert.deepEqual(buildCompletionDropOptions({ class: 'mago' }, 4, true), {
        encounterTier: 'boss',
        rarityBias: 'late_boss',
        playerClass: 'mago'
    });
});

test('buildCompletionDropPolicy só libera Mítico na elite', () => {
    assert.deepEqual(buildCompletionDropPolicy(false), {
        isDungeon: true,
        isEliteDungeon: false
    });

    assert.deepEqual(buildCompletionDropPolicy(true), {
        isDungeon: true,
        isEliteDungeon: true
    });
});

test('getCompletionBonus dá mais valor para elite sem criar chave garantida', () => {
    const common = getCompletionBonus({ playerLevel: 10, clearedRooms: 5, isEliteDungeon: false });
    const elite = getCompletionBonus({ playerLevel: 10, clearedRooms: 5, isEliteDungeon: true });

    assert.equal(common.glorias, 2);
    assert.equal(elite.glorias, 4);
    assert.equal(elite.xp > common.xp, true);
    assert.equal(elite.gold > common.gold, true);
});

test('helpers de raridade comparam corretamente', () => {
    assert.equal(getRarityRank('Comum') < getRarityRank('Raro'), true);
    assert.equal(isRarityAtLeast('Épico', 'Raro'), true);
    assert.equal(isRarityAtLeast('Incomum', 'Raro'), false);
});

test('generateDungeonCompletionDrop respeita raridade mínima da dungeon comum', () => {
    const player = playerFixture();

    for (let i = 0; i < 20; i += 1) {
        const drop = generateDungeonCompletionDrop(player, 1, false);
        assert.equal(isRarityAtLeast(drop.rarity, 'Incomum'), true, `drop ${drop.name} veio ${drop.rarity}`);
        assert.notEqual(drop.rarity, 'Mítico');
    }
});

test('generateDungeonCompletionDrop da Cripta preserva mínimo Raro', () => {
    const player = playerFixture({
        level: 12,
        dungeonProgress: {
            mapId: 'cripta_em_ruinas'
        }
    });

    for (let i = 0; i < 20; i += 1) {
        const drop = generateDungeonCompletionDrop(player, 2, false);
        assert.equal(isRarityAtLeast(drop.rarity, 'Raro'), true, `drop ${drop.name} veio ${drop.rarity}`);
        assert.notEqual(drop.rarity, 'Mítico');
    }
});

test('finalizeDungeonRun adiciona item final com tag de política e minRarity no summary', () => {
    const player = playerFixture();

    const result = finalizeDungeonRun(player, 'complete');

    assert.equal(result.completed, true);
    assert.ok(result.summary.completionItem);
    assert.equal(isRarityAtLeast(result.summary.completionItem.rarity, result.summary.completionItem.minRarity), true);
    assert.equal(result.summary.completionItem.rewardTag.includes('mínimo'), true);
    assert.equal(result.summary.notes.some(note => note.includes('Política de recompensa')), true);
});

test('buildCompletionRewardTag comunica mínimo da recompensa final', () => {
    assert.equal(buildCompletionRewardTag(1, false), 'Comum • mínimo Incomum');
    assert.equal(buildCompletionRewardTag(4, true), 'Elite • mínimo Lendário');
});
