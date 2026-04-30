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

test('progressBar com emojis usa largura mínima de 10 blocos', () => {
    const bar = progressBar(5, 10, 8, '🟩', '⬛');

    assert.equal(getEffectiveProgressBarSize(8, '🟩', '⬛'), 10);
    assert.equal([...bar].length, 20); // emojis compostos ocupam dois codepoints em spread
    assert.equal((bar.match(/🟩/g) || []).length, 5);
    assert.equal((bar.match(/⬛/g) || []).length, 5);
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
