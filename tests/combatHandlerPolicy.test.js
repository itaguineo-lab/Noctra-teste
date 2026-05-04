const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('index.js usa combatSoulFixed como handler oficial de combate', () => {
    const indexSource = readRepoFile('index.js');

    assert.match(
        indexSource,
        /const\s+combat\s*=\s*require\(['"]\.\/src\/handlers\/combatSoulFixed['"]\)/,
        'index.js deve importar ./src/handlers/combatSoulFixed como handler oficial de combate'
    );

    assert.doesNotMatch(
        indexSource,
        /const\s+combat\s*=\s*require\(['"]\.\/src\/handlers\/combatFixed['"]\)/,
        'index.js não deve voltar para combatFixed diretamente'
    );

    assert.doesNotMatch(
        indexSource,
        /const\s+combat\s*=\s*require\(['"]\.\/src\/handlers\/combat['"]\)/,
        'index.js não deve voltar para combat.js diretamente'
    );
});

test('combatSoulFixed preserva combatFixed e sobrescreve handleSoulMenu', () => {
    const source = readRepoFile('src/handlers/combatSoulFixed.js');

    assert.match(source, /const\s+combatFixed\s*=\s*require\(['"]\.\/combatFixed['"]\)/);
    assert.match(source, /\.\.\.combatFixed/);
    assert.match(source, /handleSoulMenu/);
    assert.match(source, /soulChoiceMenu\(stored\.fight\)/);
});

test('política de handler de combate está documentada', () => {
    const doc = readRepoFile('docs/COMBAT_HANDLER_POLICY.md');

    assert.match(doc, /combatSoulFixed/);
    assert.match(doc, /Não trocar o import do `index\.js`/);
    assert.match(doc, /Consolidação futura correta/);
});
