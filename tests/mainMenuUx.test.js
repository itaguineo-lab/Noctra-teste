const test = require('node:test');
const assert = require('node:assert/strict');

const { mainMenu } = require('../src/menus/mainMenu');
const { buildMainMenuText } = require('../src/utils/helpers');

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Admin',
        class: 'guerreiro',
        level: 10,
        hp: 120,
        maxHp: 120,
        energy: 10,
        maxEnergy: 20,
        xp: 100,
        gold: 50,
        nox: 0,
        keys: 1,
        currentMap: 'clareira_sombria',
        equipment: {},
        cosmetics: [],
        activeCosmetics: {},
        vip: false,
        ...overrides
    };
}

function getButtonsLayout() {
    const keyboard = mainMenu().reply_markup.inline_keyboard;
    return keyboard.map(row => row.map(btn => ({ text: btn.text, callback_data: btn.callback_data })));
}

test('mainMenu mantém callbacks esperados e hunt sozinho na primeira linha', () => {
    const layout = getButtonsLayout();

    assert.equal(layout[0].length, 1);
    assert.equal(layout[0][0].text, '⚔️ Caçar');
    assert.equal(layout[0][0].callback_data, 'hunt');

    const callbacks = layout.flat().map(btn => btn.callback_data);
    const expected = [
        'hunt', 'inventory', 'profile', 'energy', 'daily', 'dungeon', 'travel',
        'expedition', 'arena', 'shop', 'ranking', 'vip'
    ];

    assert.deepEqual(callbacks, expected);
});

test('mainMenu mostra Inventário e remove Online do menu principal', () => {
    const layout = getButtonsLayout();
    const texts = layout.flat().map(btn => btn.text);
    const callbacks = layout.flat().map(btn => btn.callback_data);

    assert.equal(texts.includes('🎒 Inventário'), true);
    assert.equal(texts.includes('🎒 Mochila'), false);
    assert.equal(texts.includes('👥 Online'), false);
    assert.equal(callbacks.includes('online'), false);
});

test('buildMainMenuText contém bloco de próximo passo', () => {
    const text = buildMainMenuText(playerFixture(), 'Admin');

    assert.match(text, /🎯 Próximo passo/);
    assert.match(text, /Caçar para ganhar XP, ouro e possíveis equipamentos\./);
});
