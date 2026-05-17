const test = require('node:test');
const assert = require('node:assert/strict');

const {
    navigateScreen,
    _internals
} = require('../src/utils/uiNavigator');

test('isValidMedia aceita apenas string não vazia', () => {
    assert.equal(_internals.isValidMedia('abc'), true);
    assert.equal(_internals.isValidMedia('  '), false);
    assert.equal(_internals.isValidMedia(null), false);
    assert.equal(_internals.isValidMedia(undefined), false);
    assert.equal(_internals.isValidMedia(123), false);
});

test('navigateScreen usa texto quando media for inválida', async () => {
    const calls = [];

    const ctx = {
        callbackQuery: { message: { message_id: 10 } },
        editMessageText: async (text, payload) => {
            calls.push(['text', text, payload]);
            return { ok: true };
        },
        reply: async () => {
            calls.push(['reply']);
            return { ok: true };
        },
        replyWithPhoto: async () => {
            calls.push(['photo']);
            return { ok: true };
        }
    };

    await navigateScreen(ctx, {
        text: 'Tela sem mídia',
        media: '',
        options: {}
    });

    assert.equal(calls[0][0], 'text');
    assert.equal(calls.some((c) => c[0] === 'photo'), false);
});

test('navigateScreen usa foto quando media for válida', async () => {
    const calls = [];

    const ctx = {
        chat: { id: 1 },
        callbackQuery: { message: { message_id: 2 } },
        telegram: {
            editMessageMedia: async () => {
                calls.push('editMessageMedia');
                return true;
            }
        },
        replyWithPhoto: async () => {
            calls.push('replyWithPhoto');
            return true;
        },
        editMessageText: async () => {
            calls.push('editMessageText');
            return true;
        },
        reply: async () => {
            calls.push('reply');
            return true;
        }
    };

    await navigateScreen(ctx, {
        text: 'Tela com mídia',
        media: 'AgAC123',
        options: {}
    });

    assert.equal(calls.includes('editMessageMedia') || calls.includes('replyWithPhoto'), true);
    assert.equal(calls.includes('editMessageText'), false);
});
