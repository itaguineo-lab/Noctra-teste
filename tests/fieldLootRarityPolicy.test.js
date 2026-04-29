const test = require('node:test');
const assert = require('node:assert/strict');

const { __private } = require('../src/services/rewardService');

const {
    canDropMythic,
    isDungeonOrExternalDrop,
    isForbiddenFieldRarity,
    downgradeForbiddenFieldDrop
} = __private;

function makeItem(rarity) {
    return {
        id: `test_${rarity}`,
        name: `Item ${rarity}`,
        rarity,
        qualityLabel: rarity,
        powerTier: rarity,
        flavor: `Raridade: ${rarity}.`
    };
}

test('campo comum, elite e miniboss não aceitam Lendário nem Mítico', () => {
    for (const tier of ['common', 'elite', 'miniboss']) {
        assert.equal(isForbiddenFieldRarity(makeItem('Lendário'), tier), true, `${tier} não deveria aceitar Lendário`);
        assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), tier), true, `${tier} não deveria aceitar Mítico`);
        assert.equal(isForbiddenFieldRarity(makeItem('Épico'), tier), false, `${tier} deveria aceitar Épico`);
    }
});

test('boss de campo aceita Lendário, mas não Mítico', () => {
    assert.equal(isForbiddenFieldRarity(makeItem('Lendário'), 'boss'), false);
    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss'), true);
});

test('dungeon comum não é salvo-conduto para Mítico', () => {
    assert.equal(canDropMythic({ isDungeon: true }), false);
    assert.equal(canDropMythic({ isDungeonBoss: true }), false);
    assert.equal(isDungeonOrExternalDrop({ isDungeon: true }), false);
    assert.equal(isDungeonOrExternalDrop({ isDungeonBoss: true }), false);
    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss', { isDungeon: true }), true);
    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss', { isDungeonBoss: true }), true);
});

test('dungeon elite, world boss e evento podem usar raridade Mítica', () => {
    assert.equal(canDropMythic({ isEliteDungeon: true }), true);
    assert.equal(canDropMythic({ allowMythicDrop: true }), true);
    assert.equal(canDropMythic({ isWorldBoss: true }), true);
    assert.equal(canDropMythic({ isEventBoss: true }), true);

    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss', { isEliteDungeon: true }), false);
    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss', { allowMythicDrop: true }), false);
    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss', { isWorldBoss: true }), false);
    assert.equal(isForbiddenFieldRarity(makeItem('Mítico'), 'boss', { isEventBoss: true }), false);
});

test('drop proibido de campo comum é rebaixado para Épico', () => {
    const item = downgradeForbiddenFieldDrop(makeItem('Mítico'), 'common');

    assert.equal(item.rarity, 'Épico');
    assert.equal(item.qualityLabel, 'Épico');
    assert.equal(item.powerTier, 'Épico');
    assert.equal(item.__rarityPolicyAdjusted, true);
    assert.match(item.name, /Épico/);
    assert.doesNotMatch(item.name, /Mítico|Lendário/);
});

test('drop proibido de boss de campo é rebaixado para Lendário', () => {
    const item = downgradeForbiddenFieldDrop(makeItem('Mítico'), 'boss');

    assert.equal(item.rarity, 'Lendário');
    assert.equal(item.qualityLabel, 'Lendário');
    assert.equal(item.powerTier, 'Lendário');
    assert.equal(item.__rarityPolicyAdjusted, true);
    assert.match(item.name, /Lendário/);
    assert.doesNotMatch(item.name, /Mítico/);
});

test('drop permitido não é alterado', () => {
    const item = makeItem('Épico');
    const result = downgradeForbiddenFieldDrop(item, 'common');

    assert.equal(result, item);
});
