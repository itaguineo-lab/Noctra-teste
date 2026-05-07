const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('combatActive existe como entrypoint canônico de combate', () => {
    const source = readRepoFile('src/handlers/combatActive.js');

    assert.match(source, /HANDLER OFICIAL DE COMBATE/);
    assert.match(source, /module\.exports\s*=\s*require\(['"]\.\/combatSoulFixed['"]\)/);
});

test('combatActive exporta o mesmo contrato público do handler ativo atual', () => {
    const combatActive = require('../src/handlers/combatActive');
    const combatSoulFixed = require('../src/handlers/combatSoulFixed');

    const requiredHandlers = [
        'handleHunt',
        'handleAttack',
        'handleDefend',
        'handleSoulMenu',
        'handleSoul',
        'handleConsumables',
        'handleUseConsumable',
        'handleFlee',
        'handleCombatBack',
        'handleViewDroppedLoot',
        'handleEquipDroppedLoot'
    ];

    for (const handlerName of requiredHandlers) {
        assert.equal(typeof combatActive[handlerName], 'function', `${handlerName} deve existir em combatActive`);
        assert.equal(combatActive[handlerName], combatSoulFixed[handlerName], `${handlerName} deve apontar para o handler ativo atual`);
    }
});

test('documentação do entrypoint ativo explica a cadeia atual e a meta futura', () => {
    const doc = readRepoFile('docs/COMBAT_ACTIVE_ENTRYPOINT.md');

    assert.match(doc, /combatActive -> combatSoulFixed -> combatFixed -> combat/);
    assert.match(doc, /combatActive -> lógica consolidada final/);
    assert.match(doc, /não trocar handler ativo sem teste/i);
});
