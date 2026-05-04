const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getSoulButtonLabel,
    soulChoiceMenu,
    resolveSoulMenuSlots
} = require('../src/menus/combatMenu');

function keyboardText(markup) {
    return JSON.stringify(markup.reply_markup);
}

function activeSoul() {
    return {
        id: 'soul_wolf',
        name: 'Alma do Lobo Sombrio',
        emoji: '🐺',
        effect: {
            type: 'damage'
        }
    };
}

function passiveSoul() {
    return {
        id: 'soul_guardian',
        name: 'Alma Guardiã',
        emoji: '🛡️',
        effect: {
            type: 'passive'
        }
    };
}

test('getSoulButtonLabel mostra somente emoji e nome da alma ativa', () => {
    assert.equal(
        getSoulButtonLabel(activeSoul(), 0, 0),
        '🐺 Alma do Lobo Sombrio'
    );
});

test('getSoulButtonLabel mostra somente emoji e nome da alma passiva', () => {
    assert.equal(
        getSoulButtonLabel(passiveSoul(), 1, 0),
        '🛡️ Alma Guardiã'
    );
});

test('getSoulButtonLabel mostra cooldown sem linguagem de slot', () => {
    assert.equal(
        getSoulButtonLabel(activeSoul(), 0, 2),
        '⏳ Alma do Lobo Sombrio • 2t'
    );
});

test('soulChoiceMenu com fight usa nomes reais em vez de slot vazio ou rótulo genérico', () => {
    const menu = soulChoiceMenu({
        player: {
            souls: [activeSoul(), passiveSoul()],
            soulCooldowns: [0, 0]
        }
    });

    const raw = keyboardText(menu);

    assert.match(raw, /🐺 Alma do Lobo Sombrio/);
    assert.match(raw, /🛡️ Alma Guardiã/);
    assert.doesNotMatch(raw, /Slot 1 vazio/);
    assert.doesNotMatch(raw, /Slot 2 vazio/);
    assert.doesNotMatch(raw, /Slot 1/);
    assert.doesNotMatch(raw, /Slot 2/);
    assert.doesNotMatch(raw, /Alma equipada/);
    assert.doesNotMatch(raw, /Passiva/);
});

test('soulChoiceMenu sem fight mantém fallback, mas não mostra slot vazio', () => {
    const menu = soulChoiceMenu();
    const raw = keyboardText(menu);

    assert.match(raw, /Alma equipada/);
    assert.doesNotMatch(raw, /Slot 1 vazio/);
    assert.doesNotMatch(raw, /Slot 2 vazio/);
});

test('resolveSoulMenuSlots sem fight retorna fallback defensivo', () => {
    const slots = resolveSoulMenuSlots();

    assert.equal(slots.length, 2);
    assert.equal(slots[0].fallbackEquipped, true);
    assert.equal(slots[1].fallbackEquipped, true);
});
