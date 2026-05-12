const test = require('node:test');
const assert = require('node:assert/strict');

const { _internals } = require('../src/core/combat/fightService');

const {
    withFightLock,
    getActiveFightLockCount,
    normalizeUserId
} = _internals;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test('normalizeUserId converte ID para string segura', () => {
    assert.equal(normalizeUserId(12345), '12345');
    assert.equal(normalizeUserId(' 12345 '), '12345');
    assert.equal(normalizeUserId(null), '');
    assert.equal(normalizeUserId(undefined), '');
});

test('withFightLock serializa operações do mesmo usuário', async () => {
    const events = [];

    const first = withFightLock('user-lock-test', async () => {
        events.push('first:start');
        await sleep(40);
        events.push('first:end');
        return 'first-result';
    });

    const second = withFightLock('user-lock-test', async () => {
        events.push('second:start');
        events.push('second:end');
        return 'second-result';
    });

    const results = await Promise.all([first, second]);

    assert.deepEqual(results, ['first-result', 'second-result']);
    assert.deepEqual(events, [
        'first:start',
        'first:end',
        'second:start',
        'second:end'
    ]);
});

test('withFightLock permite operações paralelas de usuários diferentes', async () => {
    const events = [];

    const first = withFightLock('user-a', async () => {
        events.push('a:start');
        await sleep(40);
        events.push('a:end');
    });

    const second = withFightLock('user-b', async () => {
        events.push('b:start');
        await sleep(10);
        events.push('b:end');
    });

    await Promise.all([first, second]);

    assert.ok(events.includes('a:start'));
    assert.ok(events.includes('b:start'));
    assert.ok(events.indexOf('b:end') < events.indexOf('a:end'));
});

test('withFightLock libera lock mesmo quando operação falha', async () => {
    await assert.rejects(
        () => withFightLock('user-error', async () => {
            throw new Error('falha simulada');
        }),
        /falha simulada/
    );

    const result = await withFightLock('user-error', async () => 'ok');

    assert.equal(result, 'ok');
});

test('getActiveFightLockCount volta a zero depois das operações', async () => {
    await withFightLock('user-count', async () => {
        assert.ok(getActiveFightLockCount() >= 1);
    });

    await sleep(5);

    assert.equal(getActiveFightLockCount(), 0);
});
