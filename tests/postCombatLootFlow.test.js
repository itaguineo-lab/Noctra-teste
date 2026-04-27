const test = require('node:test');
const assert = require('node:assert/strict');

const {
    postCombatMenu,
    postLootItemMenu
} = require('../src/menus/combatMenu');

function flattenButtons(menu) {
    return menu.reply_markup.inline_keyboard.flat();
}

test('postCombatMenu não mostra botão de loot quando não há item dropado', () => {
    const buttons = flattenButtons(postCombatMenu());
    const callbackData = buttons.map(button => button.callback_data);

    assert.equal(callbackData.includes('hunt'), true);
    assert.equal(callbackData.includes('inventory'), true);
    assert.equal(callbackData.some(data => String(data || '').startsWith('combat_loot:')), false);
});

test('postCombatMenu mostra botão Ver item dropado quando há droppedItemKey', () => {
    const buttons = flattenButtons(postCombatMenu({ droppedItemKey: 'drop_123' }));
    const callbackData = buttons.map(button => button.callback_data);
    const texts = buttons.map(button => button.text);

    assert.equal(callbackData.includes('combat_loot:drop_123'), true);
    assert.equal(texts.includes('🎁 Ver item dropado'), true);
});

test('postLootItemMenu oferece equipar agora, caçar novamente, inventário, venda e menu', () => {
    const buttons = flattenButtons(postLootItemMenu('drop_123'));
    const callbackData = buttons.map(button => button.callback_data);

    assert.equal(callbackData.includes('combat_loot_equip:drop_123'), true);
    assert.equal(callbackData.includes('hunt'), true);
    assert.equal(callbackData.includes('inventory'), true);
    assert.equal(callbackData.includes('shop_sell'), true);
    assert.equal(callbackData.includes('menu'), true);
});
