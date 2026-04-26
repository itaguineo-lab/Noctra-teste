const test = require('node:test');
const assert = require('node:assert/strict');

const { Markup } = require('telegraf');

test('callback de venda por índice permanece curto e seguro para Telegram', () => {
    const sourceIndex = 123;
    const callbackData = `sell_confirm_${sourceIndex}`;

    assert.ok(Buffer.byteLength(callbackData, 'utf8') <= 64);
    assert.match(callbackData, /^sell_confirm_\d+$/);
});

test('callback antigo por key pode ultrapassar limite do Telegram e deve ser evitado em listagem', () => {
    const longLegacyKey = 'lgc_' + 'x'.repeat(120);
    const oldCallbackData = `sell_confirm_key_${encodeURIComponent(longLegacyKey)}`;

    assert.ok(Buffer.byteLength(oldCallbackData, 'utf8') > 64);

    const safeCallbackData = 'sell_confirm_0';
    const button = Markup.button.callback('Item seguro', safeCallbackData);

    assert.equal(button.callback_data, safeCallbackData);
    assert.ok(Buffer.byteLength(button.callback_data, 'utf8') <= 64);
});
