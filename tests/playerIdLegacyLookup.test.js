const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getPlayerIdVariants,
    buildPlayerIdQuery
} = require('../src/core/player/playerService');

test('getPlayerIdVariants retorna string e número para ids numéricos', () => {
    assert.deepEqual(getPlayerIdVariants(123456), ['123456', 123456]);
    assert.deepEqual(getPlayerIdVariants('123456'), ['123456', 123456]);
});

test('getPlayerIdVariants não gera número para ids não numéricos', () => {
    assert.deepEqual(getPlayerIdVariants('abc123'), ['abc123']);
});

test('buildPlayerIdQuery usa $in para compatibilidade com id legado numérico', () => {
    assert.deepEqual(buildPlayerIdQuery('123456'), {
        id: { $in: ['123456', 123456] }
    });
});

test('buildPlayerIdQuery usa igualdade simples quando não há variação numérica', () => {
    assert.deepEqual(buildPlayerIdQuery('abc123'), {
        id: 'abc123'
    });
});
