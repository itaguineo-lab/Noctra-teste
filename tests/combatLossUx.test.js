const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');
const { postCombatMenu } = require('../src/menus/combatMenu');

function flattenButtons(menu) {
    return menu.reply_markup.inline_keyboard.flat();
}

test('buildLossMessageSafe deixa claro derrota com sobrevivência em 1 HP e penalidade de XP', () => {
    const player = {
        xp: 120,
        hp: 1,
        maxHp: 100,
        energy: 3,
        maxEnergy: 20
    };

    const penalty = {
        lostXp: 12,
        rateApplied: 0.1,
        levelReduced: false
    };

    const text = combatFixed.__private.buildLossMessageSafe(player, penalty);

    assert.match(text, /DERROTA/);
    assert.match(text, /XP perdido: 12 \(10%\)/);
    assert.match(text, /sobreviveu com 1 HP/i);
    assert.doesNotMatch(text, /HP restaurado para/i);
});

test('postCombatMenu em derrota oferece menu, inventário e recuperação sem botão de loot', () => {
    const buttons = flattenButtons(postCombatMenu({ isLoss: true }));
    const callbackData = buttons.map(button => button.callback_data);

    assert.equal(callbackData.includes('menu'), true);
    assert.equal(callbackData.includes('inventory'), true);
    assert.equal(callbackData.includes('energy'), true);
    assert.equal(callbackData.includes('hunt'), false);
    assert.equal(callbackData.some(data => String(data || '').startsWith('combat_loot:')), false);
});
