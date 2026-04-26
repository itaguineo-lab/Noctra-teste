const test = require('node:test');
const assert = require('node:assert/strict');

const Player = require('../src/core/player/PlayerModel');
const {
    ITEM_POOL,
    TIER_META,
    generateDrop,
    getDisplayCategoryLabel
} = require('../src/data/itemsV2');

function getArraySubSchemaPath(arrayPath, childPath) {
    const schemaType = Player.schema.path(arrayPath);
    return schemaType?.schema?.path(childPath) || null;
}

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

test('itemsV2 mantém armas de sinergia como one_handed opcional', () => {
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
            `${weapon.name} deve ser arma de uma mão.`
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

test('generateDrop cria item com identidade de mapa, traço e origem', () => {
    const item = generateDrop(3, {
        encounterTier: 'boss',
        rarityBias: 'mid_boss',
        playerClass: 'arqueiro'
    });

    assert.ok(item.id);
    assert.ok(item.instanceId);
    assert.ok(item.name);
    assert.ok(item.originMap);
    assert.ok(item.originMapId);
    assert.ok(item.setName);
    assert.ok(item.trait);
    assert.ok(item.traitLabel);
    assert.ok(item.flavor);
    assert.ok(Array.isArray(item.tags));
    assert.ok(item.tags.length >= 3);
    assert.equal(item.originMap, TIER_META.level15.originMap);
    assert.equal(item.originMapId, TIER_META.level15.originMapId);
});

test('PlayerModel preserva metadados visuais e de origem do item', () => {
    const fields = [
        'setName',
        'originMap',
        'originMapId',
        'originTier',
        'encounterTier',
        'dropSource',
        'flavor',
        'trait',
        'traitLabel',
        'itemFamily',
        'qualityLabel',
        'tags'
    ];

    for (const field of fields) {
        assert.ok(
            getArraySubSchemaPath('inventory', field),
            `inventory deve preservar ${field}`
        );
    }
});

test('displayCategory diferencia mão secundária, anel e colar', () => {
    assert.equal(getDisplayCategoryLabel('shield'), 'Mão Secundária');
    assert.equal(getDisplayCategoryLabel('ring'), 'Anel');
    assert.equal(getDisplayCategoryLabel('necklace'), 'Colar');
});
