const test = require('node:test');
const assert = require('node:assert/strict');

const combatFixed = require('../src/handlers/combatFixed');

const {
    resolveDroppedLootItem,
    getLatestInventoryItem,
    findItemByRawIdentity
} = combatFixed.__private;

function item(name, instanceId) {
    return {
        id: instanceId,
        instanceId,
        name,
        slot: 'weapon',
        category: 'weapon',
        uiCategory: 'weapons',
        rarity: 'Comum',
        level: 1,
        atk: 1,
        def: 0,
        hp: 0,
        crit: 0
    };
}

test('findItemByRawIdentity encontra item por id ou instanceId bruto', () => {
    const player = {
        inventory: [
            item('Espada Antiga', 'drop_111'),
            item('Arco Novo', 'drop_222')
        ]
    };

    assert.equal(findItemByRawIdentity(player, 'drop_222').name, 'Arco Novo');
});

test('getLatestInventoryItem retorna o último item válido do inventário', () => {
    const player = {
        inventory: [
            item('Espada Antiga', 'drop_111'),
            item('Arco Novo', 'drop_222')
        ]
    };

    assert.equal(getLatestInventoryItem(player).name, 'Arco Novo');
});

test('resolveDroppedLootItem usa fallback para último item quando a chave do botão não bate', () => {
    const player = {
        inventory: [
            item('Espada Antiga', 'drop_111'),
            item('Arco Novo', 'drop_222')
        ],
        equipment: {
            weapon: null,
            shield: null,
            armor: null,
            necklace: null,
            ring: null,
            boots: null
        }
    };

    const resolved = resolveDroppedLootItem(player, 'drop_999_inexistente');

    assert.equal(resolved.name, 'Arco Novo');
});
