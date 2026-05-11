const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    buildDungeonKeyboard,
    isDungeonRunActive
} = require('../src/handlers/dungeon');

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function flattenButtonTexts(markup) {
    return (markup?.reply_markup?.inline_keyboard || [])
        .flat()
        .map(button => button.text);
}

function flattenCallbackData(markup) {
    return (markup?.reply_markup?.inline_keyboard || [])
        .flat()
        .map(button => button.callback_data);
}

function makeBasePlayer(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Tester',
        level: 1,
        currentMap: 'clareira_sombria',
        hp: 20,
        maxHp: 20,
        energy: 20,
        maxEnergy: 20,
        keys: 1,
        consumables: {
            potionHp: 1,
            potionEnergy: 0,
            tonicStrength: 0,
            tonicDefense: 0
        },
        dungeonProgress: {
            active: false,
            completed: false,
            aborted: false,
            mapId: 'clareira_sombria',
            maxRooms: 5,
            currentRoomIndex: 0,
            rooms: [],
            rewards: { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0, souls: 0 },
            summary: null,
            logs: [],
            combatBonus: { atk: 0, def: 0, crit: 0 },
            roomsVisited: 0
        },
        ...overrides
    };
}

function makeActiveDungeonPlayer(room) {
    return makeBasePlayer({
        dungeonProgress: {
            active: true,
            completed: false,
            aborted: false,
            mapId: 'clareira_sombria',
            maxRooms: 5,
            currentRoomIndex: 0,
            rooms: room ? [room] : [],
            rewards: { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0, souls: 0 },
            summary: null,
            logs: [],
            combatBonus: { atk: 0, def: 0, crit: 0 },
            roomsVisited: 1
        }
    });
}

test('dungeon keyboard does not expose Menu while active run has no room', () => {
    const player = makeActiveDungeonPlayer(null);
    const keyboard = buildDungeonKeyboard(player);
    const texts = flattenButtonTexts(keyboard);

    assert.equal(isDungeonRunActive(player), true);
    assert.deepEqual(texts, ['⚔️ Continuar', '🏃 Fugir']);
    assert.equal(texts.includes('🏠 Menu'), false);
});

test('dungeon keyboard does not expose Menu during active combat room', () => {
    const player = makeActiveDungeonPlayer({
        type: 'combat',
        cleared: false,
        title: 'Sala de Teste',
        description: 'Combate de teste',
        enemy: {
            name: 'Inimigo Teste',
            emoji: '👹',
            level: 1,
            hp: 10,
            maxHp: 10,
            atk: 2,
            def: 0,
            crit: 0
        }
    });

    const keyboard = buildDungeonKeyboard(player);
    const texts = flattenButtonTexts(keyboard);
    const callbacks = flattenCallbackData(keyboard);

    assert.equal(isDungeonRunActive(player), true);
    assert.equal(texts.includes('🏠 Menu'), false);
    assert.deepEqual(callbacks, [
        'dungeon_attack',
        'dungeon_soul_menu',
        'dungeon_consumables',
        'dungeon_flee'
    ]);
});

test('dungeon keyboard does not expose Menu after clearing a room while run remains active', () => {
    const player = makeActiveDungeonPlayer({
        type: 'treasure',
        cleared: true,
        title: 'Tesouro de Teste',
        description: 'Tesouro já aberto'
    });

    const keyboard = buildDungeonKeyboard(player);
    const texts = flattenButtonTexts(keyboard);

    assert.equal(isDungeonRunActive(player), true);
    assert.deepEqual(texts, ['➡️ Próxima sala', '🏃 Fugir']);
    assert.equal(texts.includes('🏠 Menu'), false);
});

test('dungeon keyboard only exposes Menu outside active run', () => {
    const player = makeBasePlayer();
    const keyboard = buildDungeonKeyboard(player);
    const texts = flattenButtonTexts(keyboard);

    assert.equal(isDungeonRunActive(player), false);
    assert.equal(texts.includes('🏠 Menu'), true);
    assert.equal(texts.some(text => text.includes('Nova expedição')), true);
});

test('index registers dungeon lock middleware before global routes and handlers', () => {
    const source = readRepoFile('index.js');

    assert.match(source, /function\s+registerDungeonLockMiddleware\s*\(/);
    assert.match(source, /function\s+redirectDungeonLockedPlayer\s*\(/);
    assert.match(source, /const\s+DUNGEON_ALLOWED_CALLBACKS\s*=\s*new\s+Set/);
    assert.match(source, /registerAntiBanMiddleware\(\);\s*registerDungeonLockMiddleware\(\);\s*registerGlobalErrorHandler\(\);\s*registerStartFlow\(\);/s);
});
