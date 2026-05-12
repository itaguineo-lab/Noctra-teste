const test = require('node:test');
const assert = require('node:assert/strict');

const { recalculateStats } = require('../src/core/player/playerService');

function buildBasePlayer(overrides = {}) {
    return {
        id: 'test-player-stats',
        name: 'Caçador Teste',
        class: 'guerreiro',
        level: 5,
        xp: 0,
        gold: 100,
        nox: 0,
        glorias: 0,
        keys: 0,
        hp: 37,
        maxHp: 120,
        atk: 12,
        def: 10,
        crit: 5,
        energy: 20,
        maxEnergy: 20,
        lastEnergyUpdate: new Date(),
        vip: false,
        vipExpires: null,
        bonusInventory: 0,
        maxInventory: 20,
        inventory: [],
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

test('recalculateStats não restaura HP cheio automaticamente', () => {
    const player = buildBasePlayer({
        hp: 37,
        level: 5
    });

    recalculateStats(player);

    assert.equal(player.hp, 37);
    assert.ok(player.maxHp > player.hp);
});

test('recalculateStats limita HP ao novo maxHp sem criar cura indevida', () => {
    const player = buildBasePlayer({
        class: 'mago',
        level: 1,
        hp: 999,
        maxHp: 999
    });

    recalculateStats(player);

    assert.equal(player.maxHp, 80);
    assert.equal(player.hp, 80);
});

test('equipamento com bônus de HP aumenta maxHp sem encher a vida atual', () => {
    const player = buildBasePlayer({
        hp: 50,
        level: 1,
        equipment: {
            weapon: null,
            shield: null,
            armor: {
                id: 'armor_hp_test',
                instanceId: 'armor_hp_test_1',
                name: 'Couraça de Teste',
                slot: 'armor',
                category: 'armor',
                uiCategory: 'armors',
                displayCategory: 'Armadura',
                rarity: 'Comum',
                level: 1,
                atk: 0,
                def: 1,
                hp: 40,
                crit: 0
            },
            necklace: null,
            ring: null,
            boots: null
        }
    });

    recalculateStats(player);

    assert.equal(player.maxHp, 160);
    assert.equal(player.hp, 50);
});
