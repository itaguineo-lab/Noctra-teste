const test = require('node:test');
const assert = require('node:assert/strict');

const {
    isCombatRoomType,
    countCombatRoomTypes,
    tuneDungeonRoomTypesForCombatPacing
} = require('../src/core/dungeon/dungeonService');

test('isCombatRoomType identifica combate, elite e boss como ameaça real', () => {
    assert.equal(isCombatRoomType('combat'), true);
    assert.equal(isCombatRoomType('elite'), true);
    assert.equal(isCombatRoomType('boss'), true);
    assert.equal(isCombatRoomType('treasure'), false);
    assert.equal(isCombatRoomType('heal'), false);
    assert.equal(isCombatRoomType('shrine'), false);
});

test('countCombatRoomTypes conta salas com inimigos', () => {
    assert.equal(
        countCombatRoomTypes(['combat', 'treasure', 'heal', 'curse', 'boss']),
        2
    );

    assert.equal(
        countCombatRoomTypes(['combat', 'elite', 'shrine', 'curse', 'boss']),
        3
    );
});

test('tuneDungeonRoomTypesForCombatPacing garante pelo menos 3 ameaças em dungeon de 5 salas', () => {
    const tuned = tuneDungeonRoomTypesForCombatPacing([
        'combat',
        'treasure',
        'heal',
        'shrine',
        'boss'
    ]);

    assert.equal(tuned[0], 'combat');
    assert.equal(tuned[tuned.length - 1], 'boss');
    assert.equal(countCombatRoomTypes(tuned) >= 3, true);
});

test('tuneDungeonRoomTypesForCombatPacing preserva sequência já agressiva', () => {
    const original = ['combat', 'elite', 'treasure', 'combat', 'boss'];
    const tuned = tuneDungeonRoomTypesForCombatPacing(original);

    assert.deepEqual(tuned, original);
});

test('tuneDungeonRoomTypesForCombatPacing não força dungeons curtas', () => {
    const original = ['combat', 'heal', 'boss'];
    const tuned = tuneDungeonRoomTypesForCombatPacing(original);

    assert.deepEqual(tuned, original);
});
