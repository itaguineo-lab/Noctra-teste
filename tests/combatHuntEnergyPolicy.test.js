const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function mod(relativePath) {
    return path.join(ROOT, relativePath);
}

function createCtx() {
    return {
        from: { id: 123 },
        answerCbQueryCalls: [],
        async answerCbQuery(text, options) { this.answerCbQueryCalls.push({ text, options }); },
        async deleteMessage() {},
        async reply() { return { message_id: 1 }; },
        async replyWithPhoto() { return { message_id: 1 }; }
    };
}

function loadCombatWithMocks(setup) {
    const combatPath = mod('src/handlers/combat.js');
    const deps = [
        'src/core/player/playerService.js',
        'src/services/rewardService.js',
        'src/menus/combatMenu.js',
        'src/utils/formatters.js',
        'src/core/world/enemies.js',
        'src/data/assets.js',
        'src/data/balance.js',
        'src/core/player/playerMutations.js',
        'src/core/player/progression.js',
        'src/core/player/equipmentService.js',
        'src/core/player/itemLorePresenter.js',
        'src/core/combat/fightService.js',
        'src/core/daily/dailyService.js',
        'src/core/metrics/metricsService.js'
    ];

    delete require.cache[combatPath];
    for (const dep of deps) delete require.cache[mod(dep)];

    setup();
    return require(combatPath);
}

test('sem inimigo válido não consome energia e não cria luta', async () => {
    let consumeCalls = 0;
    let createFightCalls = 0;
    const player = { id: 'p1', currentMap: 'clareira_sombria', level: 3, energy: 7, maxEnergy: 20, dungeonProgress: { active: true, room: 2 } };

    const combat = loadCombatWithMocks(() => {
        require.cache[mod('src/core/player/playerService.js')] = { exports: { getPlayer: async () => player, savePlayer: async () => {} } };
        require.cache[mod('src/core/world/enemies.js')] = { exports: { getRandomEnemy: () => null } };
        require.cache[mod('src/core/player/playerMutations.js')] = { exports: { consumeEnergy: () => { consumeCalls += 1; return true; }, restoreEnergy: () => {}, consumeConsumable: () => null, normalizePlayerForSave: () => {}, normalizeInventoryItem: i => i, applyEquipmentChange: () => ({ ok: true }) } };
        require.cache[mod('src/core/combat/fightService.js')] = { exports: { createAndStoreFight: async () => { createFightCalls += 1; return {}; }, getStoredFight: async () => null, persistFightMessage: async () => {}, removeStoredFight: async () => {}, runAttack: async () => null, runDefend: async () => null, runFlee: async () => null, runSoul: async () => null, runConsumableTurn: async () => null } };
    });

    const ctx = createCtx();
    await combat.handleHunt(ctx);

    assert.equal(consumeCalls, 0);
    assert.equal(createFightCalls, 0);
    assert.equal(player.energy, 7);
    assert.deepEqual(player.dungeonProgress, { active: true, room: 2 });
});

test('com inimigo válido e energia suficiente consome energia uma vez', async () => {
    let consumeCalls = 0;
    let saveCalls = 0;
    let createFightCalls = 0;
    const player = { id: 'p2', name: 'Hunter', currentMap: 'clareira_sombria', level: 2, energy: 5, maxEnergy: 20, dungeonProgress: { active: false } };

    const combat = loadCombatWithMocks(() => {
        require.cache[mod('src/core/player/playerService.js')] = { exports: { getPlayer: async () => player, savePlayer: async () => { saveCalls += 1; } } };
        require.cache[mod('src/core/world/enemies.js')] = { exports: { getRandomEnemy: () => ({ id: 'slime', name: 'Slime', hp: 10, maxHp: 10, atk: 2, def: 1, crit: 0, level: 1, emoji: '🟢' }) } };
        require.cache[mod('src/core/player/playerMutations.js')] = { exports: { consumeEnergy: (p, amount) => { consumeCalls += 1; if (p.energy < amount) return false; p.energy -= amount; return true; }, restoreEnergy: () => {}, consumeConsumable: () => null, normalizePlayerForSave: () => {}, normalizeInventoryItem: i => i, applyEquipmentChange: () => ({ ok: true }) } };
        require.cache[mod('src/core/combat/fightService.js')] = { exports: { createAndStoreFight: async () => { createFightCalls += 1; return { enemy: { id: 'slime', hp: 10, maxHp: 10, atk: 2, def: 1, crit: 0, level: 1, name: 'Slime', emoji: '🟢' }, player: { name: 'Hunter', hp: 10, maxHp: 10, energy: 4, maxEnergy: 20, atk: 1, def: 1, level: 2 }, logs: [], status: 'ongoing' }; }, getStoredFight: async () => null, persistFightMessage: async () => {}, removeStoredFight: async () => {}, runAttack: async () => null, runDefend: async () => null, runFlee: async () => null, runSoul: async () => null, runConsumableTurn: async () => null } };
    });

    await combat.handleHunt(createCtx());
    assert.equal(consumeCalls, 1);
    assert.equal(createFightCalls, 1);
    assert.equal(saveCalls, 1);
    assert.equal(player.energy, 4);
    assert.deepEqual(player.dungeonProgress, { active: false });
});

test('com inimigo válido e energia insuficiente não cria luta e dungeonProgress permanece', async () => {
    let createFightCalls = 0;
    const player = { id: 'p3', currentMap: 'clareira_sombria', level: 2, energy: 0, maxEnergy: 20, dungeonProgress: { active: true, room: 1 } };

    const combat = loadCombatWithMocks(() => {
        require.cache[mod('src/core/player/playerService.js')] = { exports: { getPlayer: async () => player, savePlayer: async () => { throw new Error('savePlayer não deveria ser chamado'); } } };
        require.cache[mod('src/core/world/enemies.js')] = { exports: { getRandomEnemy: () => ({ id: 'wolf', name: 'Lobo', hp: 30, maxHp: 30, atk: 8, def: 3, crit: 0, level: 2 }) } };
        require.cache[mod('src/core/player/playerMutations.js')] = { exports: { consumeEnergy: () => false, restoreEnergy: () => {}, consumeConsumable: () => null, normalizePlayerForSave: () => {}, normalizeInventoryItem: i => i, applyEquipmentChange: () => ({ ok: true }) } };
        require.cache[mod('src/core/combat/fightService.js')] = { exports: { createAndStoreFight: async () => { createFightCalls += 1; return {}; }, getStoredFight: async () => null, persistFightMessage: async () => {}, removeStoredFight: async () => {}, runAttack: async () => null, runDefend: async () => null, runFlee: async () => null, runSoul: async () => null, runConsumableTurn: async () => null } };
    });

    const ctx = createCtx();
    await combat.handleHunt(ctx);
    assert.equal(createFightCalls, 0);
    assert.equal(player.energy, 0);
    assert.deepEqual(player.dungeonProgress, { active: true, room: 1 });
    assert.equal(ctx.answerCbQueryCalls[0].text, '⚡ Sem energia.');
});
