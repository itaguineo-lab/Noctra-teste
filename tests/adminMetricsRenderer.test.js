const test = require('node:test');
const assert = require('node:assert/strict');

const {
    pct,
    formatRarityLine,
    renderRarityBlock,
    renderMetricsMessage
} = require('../src/renderers/adminMetricsRenderer');

test('pct evita divisão por zero', () => {
    assert.equal(pct(1, 0), '0.0');
    assert.equal(pct(0, 0), '0.0');
});

test('pct calcula percentual com uma casa decimal', () => {
    assert.equal(pct(1, 4), '25.0');
    assert.equal(pct(2, 3), '66.7');
});

test('formatRarityLine renderiza contagem e percentual', () => {
    assert.equal(formatRarityLine('Épico', 2, 10), '• Épico: 2 (20.0%)');
});

test('renderRarityBlock mostra todas as raridades', () => {
    const text = renderRarityBlock({
        rarity: {
            comum: 4,
            incomum: 3,
            raro: 2,
            epico: 1,
            lendario: 0,
            mitico: 0,
            unknown: 0,
            totalKnown: 10,
            totalTracked: 10
        }
    });

    assert.match(text, /\*Raridade dos Itens\*/);
    assert.match(text, /Comum: 4 \(40\.0%\)/);
    assert.match(text, /Incomum: 3 \(30\.0%\)/);
    assert.match(text, /Raro: 2 \(20\.0%\)/);
    assert.match(text, /Épico: 1 \(10\.0%\)/);
    assert.match(text, /Lendário: 0 \(0\.0%\)/);
    assert.match(text, /Mítico: 0 \(0\.0%\)/);
    assert.match(text, /Unknown: 0 \(0\.0%\)/);
});

test('renderMetricsMessage inclui seção de raridade', () => {
    const text = renderMetricsMessage({
        dateKey: '2026-04-29',
        counters: {
            playersCreated: 1,
            menuLoads: 2,
            combatsStarted: 3,
            combatsWon: 2,
            combatsLost: 1,
            combatsFled: 0,
            dungeonsStarted: 1,
            dungeonsCompleted: 1,
            dungeonsAbandoned: 0,
            dungeonRoomsCleared: 4,
            itemsDropped: 2,
            soulsDropped: 1,
            keysDropped: 1,
            goldAwarded: 100,
            xpAwarded: 80,
            consumablesUsed: 1
        },
        rarity: {
            comum: 1,
            incomum: 0,
            raro: 0,
            epico: 1,
            lendario: 0,
            mitico: 0,
            unknown: 0,
            totalKnown: 2,
            totalTracked: 2
        },
        derived: {
            winRate: '66.7',
            dungeonFinishRate: '100.0',
            avgGoldPerCombat: 50,
            avgXpPerCombat: 40
        }
    });

    assert.match(text, /NOCTRA METRICS — 2026-04-29/);
    assert.match(text, /\*Raridade dos Itens\*/);
    assert.match(text, /Comum: 1 \(50\.0%\)/);
    assert.match(text, /Épico: 1 \(50\.0%\)/);
});
