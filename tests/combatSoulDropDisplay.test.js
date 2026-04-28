const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    getRegularLootLines,
    buildVictoryMessageWithSoulDrop
} = combatFixed.__private;

function player(overrides = {}) {
    return {
        name: 'Admin',
        level: 10,
        xp: 20,
        hp: 95,
        maxHp: 120,
        energy: 7,
        maxEnergy: 20,
        gold: 300,
        ...overrides
    };
}

function rewards(overrides = {}) {
    return {
        xp: 25,
        gold: 40,
        loot: [],
        droppedItem: null,
        inventoryFull: false,
        soulDropped: false,
        soulDropText: null,
        soulLootLine: null,
        keyDropped: false,
        leveledUp: false,
        ...overrides
    };
}

test('getRegularLootLines remove linha de alma e item já destacado', () => {
    const lines = getRegularLootLines(rewards({
        droppedItem: { name: 'Espada Sombria' },
        loot: [
            '⚔️ Espada Sombria Lv10 [Raro] • Arma',
            '🌑 ALMA ENCONTRADA: Alma do Lobo',
            '🗝️ Chave de Masmorra'
        ]
    }));

    assert.deepEqual(lines, ['🗝️ Chave de Masmorra']);
});

test('buildVictoryMessageWithSoulDrop mostra texto especial quando alma dropa', () => {
    const text = buildVictoryMessageWithSoulDrop(player(), rewards({
        soulDropped: true,
        soulDropText:
            '🌑 *ALMA ENCONTRADA*\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Boss de Campo: Alfa da Matilha\n\n' +
            '🐺 Alma do Lobo Sombrio\n' +
            'Essa alma foi enviada para sua coleção.'
    }));

    assert.match(text, /VITÓRIA/);
    assert.match(text, /ALMA ENCONTRADA/);
    assert.match(text, /Alfa da Matilha/);
    assert.match(text, /Alma do Lobo Sombrio/);
    assert.match(text, /coleção/);
});

test('buildVictoryMessageWithSoulDrop mantém item, chave e level up', () => {
    const text = buildVictoryMessageWithSoulDrop(player({ level: 11 }), rewards({
        droppedItem: {
            id: 'weapon_1',
            name: 'Espada Sombria',
            rarity: 'Raro',
            slot: 'weapon',
            atk: 10,
            def: 0,
            hp: 0,
            crit: 0,
            emoji: '⚔️',
            displayCategory: 'Arma'
        },
        keyDropped: true,
        leveledUp: true
    }));

    assert.match(text, /Item encontrado/);
    assert.match(text, /Espada Sombria/);
    assert.match(text, /Chave de Masmorra obtida/);
    assert.match(text, /LEVEL UP/);
});

test('buildVictoryMessageWithSoulDrop usa fallback quando não houver soulDropText', () => {
    const text = buildVictoryMessageWithSoulDrop(player(), rewards({
        soulDropped: true,
        soulLootLine: '🌑 ALMA ENCONTRADA: Alma Antiga'
    }));

    assert.match(text, /ALMA ENCONTRADA/);
    assert.match(text, /Alma Antiga/);
});
