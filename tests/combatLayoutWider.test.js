const test = require('node:test');
const assert = require('node:assert/strict');

const {
    progressBar,
    getEffectiveProgressBarSize
} = require('../src/utils/formatters');

const {
    combatMenu,
    cooperativeCombatMenu
} = require('../src/menus/combatMenu');

function keyboardText(keyboard) {
    return JSON.stringify(keyboard.reply_markup);
}

function countOccurrences(text, pattern) {
    return (String(text || '').match(pattern) || []).length;
}

test('progressBar com emojis usa 10 blocos quando chamada compacta de menu', () => {
    const bar = progressBar(5, 10, 6, '🟩', '⬛');
    const filled = countOccurrences(bar, /🟩/g);
    const empty = countOccurrences(bar, /⬛/g);

    assert.equal(getEffectiveProgressBarSize(6, '🟩', '⬛'), 10);
    assert.equal(filled, 5);
    assert.equal(empty, 5);
    assert.equal(filled + empty, 10);
});

test('progressBar com emojis respeita 8 blocos quando o renderer pede barra compacta de combate', () => {
    const bar = progressBar(4, 8, 8, '🟥', '⬛');
    const filled = countOccurrences(bar, /🟥/g);
    const empty = countOccurrences(bar, /⬛/g);

    assert.equal(getEffectiveProgressBarSize(8, '🟥', '⬛'), 8);
    assert.equal(filled, 4);
    assert.equal(empty, 4);
    assert.equal(filled + empty, 8);
});

test('progressBar textual preserva tamanho solicitado', () => {
    assert.equal(getEffectiveProgressBarSize(6, '#', '-'), 6);
    assert.equal(progressBar(3, 6, 6, '#', '-'), '###---');
});

test('combatMenu solo prioriza largura 2x2 sem Defender', () => {
    const raw = keyboardText(combatMenu());

    assert.match(raw, /Atacar/);
    assert.match(raw, /Consumíveis/);
    assert.match(raw, /Almas/);
    assert.match(raw, /Fugir/);
    assert.doesNotMatch(raw, /Defender/);
    assert.match(raw, /combat_attack/);
    assert.match(raw, /combat_consumables/);
    assert.match(raw, /combat_soul_menu/);
    assert.match(raw, /combat_flee/);
});

test('cooperativeCombatMenu preserva Defender para futura função de tank', () => {
    const raw = keyboardText(cooperativeCombatMenu());

    assert.match(raw, /Atacar/);
    assert.match(raw, /Defender/);
    assert.match(raw, /Consumíveis/);
    assert.match(raw, /Almas/);
    assert.match(raw, /Fugir/);
    assert.match(raw, /combat_defend/);
});
