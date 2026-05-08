const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('combatActive existe como entrypoint canônico de combate e usa combatFixed como base', () => {
    const source = readRepoFile('src/handlers/combatActive.js');

    assert.match(source, /HANDLER OFICIAL DE COMBATE/);
    assert.match(source, /const\s+combatFixed\s*=\s*require\(['"]\.\/combatFixed['"]\)/);
    assert.doesNotMatch(source, /require\(['"]\.\/combatSoulFixed['"]\)/);
});

test('combatActive exporta o contrato público de combate e sobrescreve handleSoulMenu', () => {
    const combatActive = require('../src/handlers/combatActive');
    const combatFixed = require('../src/handlers/combatFixed');

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
    }

    assert.notEqual(
        combatActive.handleSoulMenu,
        combatFixed.handleSoulMenu,
        'combatActive deve ser dono da correção do menu de almas'
    );

    assert.equal(combatActive.handleAttack, combatFixed.handleAttack);
    assert.equal(combatActive.handleUseConsumable, combatFixed.handleUseConsumable);
});

test('combatActive expõe helpers internos testáveis da hidratação de almas', () => {
    const { _internals } = require('../src/handlers/combatActive');

    assert.equal(typeof _internals.normalizeTwoSlots, 'function');
    assert.equal(typeof _internals.hasAnyEquippedSoul, 'function');
    assert.equal(typeof _internals.hydrateFightSoulsFromPlayer, 'function');

    assert.deepEqual(_internals.normalizeTwoSlots(['a']), ['a', null]);
    assert.equal(_internals.hasAnyEquippedSoul([null, null]), false);
    assert.equal(_internals.hasAnyEquippedSoul(['soul_1', null]), true);

    const fight = { player: { souls: [null, null] } };
    const player = { soulsEquipped: ['soul_1', null] };

    assert.equal(_internals.hydrateFightSoulsFromPlayer(fight, player), true);
    assert.deepEqual(fight.player.souls, ['soul_1', null]);
});

test('documentação do entrypoint ativo explica a cadeia atual e a meta futura', () => {
    const doc = readRepoFile('docs/COMBAT_ACTIVE_ENTRYPOINT.md');

    assert.match(doc, /combatActive -> combatFixed -> combat/);
    assert.match(doc, /combatSoulFixed.*legado temporário/i);
    assert.match(doc, /combatActive -> lógica consolidada final/);
    assert.match(doc, /não trocar handler ativo sem teste/i);
});
