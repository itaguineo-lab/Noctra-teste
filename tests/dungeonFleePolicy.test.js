const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDungeonSummary,
    buildDungeonKeyboard,
    isDungeonRunActive
} = require('../src/handlers/dungeon');

function flattenButtonTexts(markup) {
    return (markup?.reply_markup?.inline_keyboard || [])
        .flat()
        .map(button => button.text);
}

function makeAbortedDungeonPlayer() {
    return {
        id: 'test-player',
        name: 'Tester',
        level: 3,
        currentMap: 'clareira_sombria',
        hp: 12,
        maxHp: 30,
        energy: 18,
        maxEnergy: 20,
        keys: 0,
        dungeonProgress: {
            active: false,
            completed: false,
            aborted: true,
            startedAt: Date.now(),
            mapId: 'clareira_sombria',
            maxRooms: 5,
            currentRoomIndex: 2,
            roomsVisited: 3,
            rooms: [
                { type: 'combat', cleared: true },
                { type: 'treasure', cleared: true },
                { type: 'elite', cleared: false }
            ],
            rewards: { xp: 37, gold: 120, keys: 0, glorias: 2, items: 1, souls: 0 },
            summary: {
                roomsCleared: 2,
                xp: 37,
                gold: 120,
                keys: 0,
                glorias: 2,
                items: 1,
                souls: 0,
                notes: [
                    '🚪 Expedição abandonada.',
                    '🗝️ A chave já foi consumida na entrada.'
                ]
            },
            logs: [],
            combatBonus: { atk: 0, def: 0, crit: 0 }
        }
    };
}

test('abandoned dungeon is no longer considered an active run', () => {
    const player = makeAbortedDungeonPlayer();

    assert.equal(isDungeonRunActive(player), false);
});

test('abandoned dungeon summary preserves partial cleared-room rewards and warns key was consumed', () => {
    const player = makeAbortedDungeonPlayer();
    const text = buildDungeonSummary(player);

    assert.match(text, /EXPEDIÇÃO ENCERRADA/);
    assert.match(text, /Salas vencidas: 2\/5/);
    assert.match(text, /37 XP/);
    assert.match(text, /120 ouro/);
    assert.match(text, /2 glórias/);
    assert.match(text, /1 item\(ns\) no total/);
    assert.match(text, /A chave já foi consumida na entrada/);
    assert.doesNotMatch(text, /Expedição perfeita/);
});

test('abandoned dungeon restores out-of-run navigation keyboard', () => {
    const player = makeAbortedDungeonPlayer();
    const keyboard = buildDungeonKeyboard(player);
    const texts = flattenButtonTexts(keyboard);

    assert.equal(texts.includes('🏠 Menu'), true);
    assert.equal(texts.some(text => text.includes('Nova expedição')), true);
});
