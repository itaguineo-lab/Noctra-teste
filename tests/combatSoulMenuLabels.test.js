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

test('getSoulButtonLabel mostra nome da alma ativa', () => {
    assert.equal(
        getSoulButtonLabel(activeSoul(), 0, 0),
        '🐺 Slot 1 • Alma do Lobo Sombrio'
    );
});

test('getSoulButtonLabel mostra passiva corretamente', () => {
    assert.equal(
        getSoulButtonLabel(passiveSoul(), 1, 0),
        '🛡️ Slot 2 • Passiva'
    );
});

test('soulChoiceMenu com fight usa almas reais em vez de slot vazio', () => {
    const menu = soulChoiceMenu({
        player: {
            souls: [activeSoul(), passiveSoul()],
            soulCooldowns: [0, 0]
        }
    });

    const raw = keyboardText(menu);

    assert.match(raw, /Alma do Lobo Sombrio/);
    assert.match(raw, /Passiva/);
    assert.doesNotMatch(raw, /Slot 1 vazio/);
    assert.doesNotMatch(raw, /Slot 2 vazio/);
});

test('soulChoiceMenu sem fight não mente com slot vazio quando handler já validou almas equipadas', () => {
    const menu = soulChoiceMenu();
    const raw = keyboardText(menu);

    assert.match(raw, /Alma equipada/);
    assert.doesNotMatch(raw, /Slot 1 vazio/);
    assert.doesNotMatch(raw, /Slot 2 vazio/);
});

test('resolveSoulMenuSlots sem fight retorna fallback equipável', () => {
    const slots = resolveSoulMenuSlots();

    assert.equal(slots.length, 2);
    assert.equal(slots[0].fallbackEquipped, true);
    assert.equal(slots[1].fallbackEquipped, true);
});
