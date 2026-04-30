const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildStatusBlock,
    buildMainMenuText
} = require('../src/utils/helpers');

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Admin',
        class: 'guerreiro',
        level: 32,
        hp: 306,
        maxHp: 408,
        energy: 19,
        maxEnergy: 20,
        xp: 3462,
        gold: 526,
        nox: 0,
        keys: 0,
        currentMap: 'cripta_em_ruinas',
        equipment: {},
        cosmetics: [],
        activeCosmetics: {},
        vip: false,
        ...overrides
    };
}

test('buildStatusBlock coloca valor e barra em linhas separadas', () => {
    const block = buildStatusBlock('❤️', 'HP', 306, 408, '🟩🟩🟩🟩🟩🟩🟩🟩⬛⬛');
    const lines = block.split('\n');

    assert.equal(lines.length, 2);
    assert.equal(lines[0], '❤️ HP: 306/408');
    assert.equal(lines[1], '🟩🟩🟩🟩🟩🟩🟩🟩⬛⬛');
});

test('buildMainMenuText não mistura barras com valores na mesma linha', () => {
    const text = buildMainMenuText(playerFixture(), 'Admin');
    const lines = text.split('\n');

    const hpLineIndex = lines.findIndex(line => line.startsWith('❤️ HP:'));
    const energyLineIndex = lines.findIndex(line => line.startsWith('⚡ Energia:'));
    const xpLineIndex = lines.findIndex(line => line.startsWith('✨ XP:'));

    assert.equal(hpLineIndex >= 0, true);
    assert.equal(energyLineIndex >= 0, true);
    assert.equal(xpLineIndex >= 0, true);

    assert.doesNotMatch(lines[hpLineIndex], /🟩/);
    assert.doesNotMatch(lines[energyLineIndex], /🟦/);
    assert.doesNotMatch(lines[xpLineIndex], /🟨/);

    assert.match(lines[hpLineIndex + 1], /🟩/);
    assert.match(lines[energyLineIndex + 1], /🟦/);
    assert.match(lines[xpLineIndex + 1], /🟨/);
});
