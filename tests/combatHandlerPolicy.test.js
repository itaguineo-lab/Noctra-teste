const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('index.js usa combatActive como handler oficial de combate', () => {
    const indexSource = readRepoFile('index.js');

    assert.match(
        indexSource,
        /const\s+combat\s*=\s*require\(['"]\.\/src\/handlers\/combatActive['"]\)/,
        'index.js deve importar ./src/handlers/combatActive como handler oficial de combate'
    );

    assert.doesNotMatch(
        indexSource,
        /const\s+combat\s*=\s*require\(['"]\.\/src\/handlers\/combatSoulFixed['"]\)/,
        'index.js não deve depender diretamente de combatSoulFixed'
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

test('combatActive preserva o handler ativo atual sem alterar contrato público', () => {
    const source = readRepoFile('src/handlers/combatActive.js');

    assert.match(source, /HANDLER OFICIAL DE COMBATE/);
    assert.match(source, /module\.exports\s*=\s*require\(['"]\.\/combatSoulFixed['"]\)/);
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
    const activeDoc = readRepoFile('docs/COMBAT_ACTIVE_ENTRYPOINT.md');

    assert.match(doc, /Consolidação futura correta/);
    assert.match(activeDoc, /combatActive/);
    assert.match(activeDoc, /não trocar handler ativo sem teste/i);
});
