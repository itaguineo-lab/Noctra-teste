const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ITEM_POOL } = require('../src/data/items');

function flattenItemPool(pool) {
    const items = [];

    for (const tier of Object.values(pool || {})) {
        for (const categoryItems of Object.values(tier || {})) {
            if (Array.isArray(categoryItems)) {
                items.push(...categoryItems);
            }
        }
    }

    return items;
}

test('armas de uma mão com sinergia de offhand não nascem como requires_offhand', () => {
    const weaponsWithOptionalOffhand = flattenItemPool(ITEM_POOL)
        .filter(item => item && item.requiredOffhandType);

    assert.ok(
        weaponsWithOptionalOffhand.length > 0,
        'O teste precisa encontrar armas com sinergia de mão secundária.'
    );

    for (const weapon of weaponsWithOptionalOffhand) {
        assert.equal(
            weapon.weaponStyle,
            'one_handed',
            `${weapon.name} deve ser arma de uma mão, não requires_offhand.`
        );
        assert.equal(
            weapon.offhandMode,
            'optional',
            `${weapon.name} deve tratar mão secundária como opcional.`
        );
        assert.notEqual(
            weapon.weaponStyle,
            'requires_offhand',
            `${weapon.name} não pode bloquear equip sem offhand.`
        );
    }
});

test('dungeon boss usa fonte de recompensa de boss de masmorra', () => {
    const dungeonRewardsPath = path.join(__dirname, '..', 'src', 'core', 'dungeon', 'dungeonRewards.js');
    const source = fs.readFileSync(dungeonRewardsPath, 'utf8');

    assert.match(
        source,
        /processVictory\(player,\s*room\.enemy,\s*\{[\s\S]*isDungeonBoss:\s*room\.type\s*===\s*['"]boss['"][\s\S]*\}\)/,
        'resolveCombatRoom deve passar isDungeonBoss quando a sala for boss.'
    );
});

test('shopLogic não trata mão secundária como armadura', () => {
    const shopLogicPath = path.join(__dirname, '..', 'src', 'core', 'economy', 'shopLogic.js');
    const source = fs.readFileSync(shopLogicPath, 'utf8');

    assert.match(
        source,
        /shield:\s*['"]Mão Secundária['"]/,
        'O slot shield deve ser exibido como Mão Secundária.'
    );
    assert.doesNotMatch(
        source,
        /shield:\s*['"]Armadura['"]/,
        'O slot shield não deve ser exibido como Armadura.'
    );
});
