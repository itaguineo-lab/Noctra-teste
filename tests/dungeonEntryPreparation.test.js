const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('dungeon_start opens preparation screen instead of consuming key directly', () => {
    const source = readRepoFile('index.js');

    assert.match(source, /function\s+buildDungeonPreparationText\s*\(/);
    assert.match(source, /function\s+handleDungeonPreparation\s*\(/);
    assert.match(source, /bindAction\(['"]dungeon_start['"],\s*handleDungeonPreparation\)/);
    assert.doesNotMatch(source, /bindAction\(['"]dungeon_start['"],\s*dungeon\.handleDungeonStart\)/);
});

test('dungeon confirmation callback is the only entrypoint that starts the run', () => {
    const source = readRepoFile('index.js');

    assert.match(source, /dungeon_confirm_start/);
    assert.match(source, /bindAction\(['"]dungeon_confirm_start['"],\s*dungeon\.handleDungeonStart\)/);
    assert.match(source, /DUNGEON_ALLOWED_CALLBACKS[\s\S]*dungeon_confirm_start/);
});

test('preparation screen warns about HP, consumables, key cost and no shopping mid-run', () => {
    const source = readRepoFile('index.js');

    assert.match(source, /PREPARAR EXPEDIÇÃO/);
    assert.match(source, /HP baixo/);
    assert.match(source, /Poção HP/);
    assert.match(source, /Tônico Força/);
    assert.match(source, /Custo de entrada/);
    assert.match(source, /não poderá sair para comprar itens/);
    assert.match(source, /A chave será consumida ao confirmar a entrada/);
});
