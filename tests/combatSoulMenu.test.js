const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getSoulButtonLabel,
    soulChoiceMenu
} = require('../src/menus/combatMenu');

function soul(overrides = {}) {
    return {
        id: 'soul_wolf',
        name: 'Alma do Lobo Sombrio',
        emoji: '🐺',
        effect: {
            type: 'damage',
            multiplier: 1.35
        },
        ...overrides
    };
}

test('getSoulButtonLabel mostra slot vazio', () => {
    assert.equal(getSoulButtonLabel(null, 0, 0), '⬜ Slot 1 vazio');
});

test('getSoulButtonLabel mostra alma pronta', () => {
    assert.equal(getSoulButtonLabel(soul(), 0, 0), '🐺 Slot 1 • Alma do Lobo Sombrio');
});

test('getSoulButtonLabel mostra cooldown', () => {
    assert.equal(getSoulButtonLabel(soul(), 1, 2), '⏳ Slot 2 • 2t');
});

test('getSoulButtonLabel mostra passiva', () => {
    assert.equal(
        getSoulButtonLabel(soul({
            name: 'Alma Guardiã',
            emoji: '🛡️',
            effect: { type: 'passive' }
        }), 0, 0),
        '🛡️ Slot 1 • Passiva'
    );
});

test('soulChoiceMenu usa labels de cooldown do fight', () => {
    const menu = soulChoiceMenu({
        player: {
            souls: [soul(), soul({ name: 'Alma Curadora', emoji: '💚' })],
            soulCooldowns: [0, 3]
        }
    });

    const raw = JSON.stringify(menu.reply_markup);

    assert.match(raw, /Alma do Lobo Sombrio/);
    assert.match(raw, /3t/);
    assert.match(raw, /combat_soul_0/);
    assert.match(raw, /combat_soul_1/);
});
