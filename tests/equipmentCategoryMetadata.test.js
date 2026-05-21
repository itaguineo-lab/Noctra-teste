const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ensureUniquePlayerItemKeys,
    equipItem,
    unequipItem
} = require('../src/core/player/equipmentService');

function createPlayer() {
    return {
        inventory: [],
        equipment: {
            weapon: null,
            shield: null,
            armor: null,
            necklace: null,
            ring: null,
            boots: null
        }
    };
}

function buildItem(slot, name, extra = {}) {
    return {
        id: `id_${slot}_${name}`,
        instanceId: `iid_${slot}_${name}`,
        slot,
        name,
        rarity: 'Comum',
        level: 1,
        atk: 0,
        def: 0,
        hp: 0,
        crit: 0,
        ...extra
    };
}

test('ensureUniquePlayerItemKeys normaliza shield para offhands e Mão Secundária', () => {
    const player = createPlayer();
    player.equipment.shield = buildItem('shield', 'Escudo de Teste', { offhandType: 'shield', def: 2 });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.shield?.uiCategory, 'offhands');
    assert.equal(player.equipment.shield?.displayCategory, 'Mão Secundária');
    assert.equal(player.equipment.shield?.category, 'armor');
});

test('ensureUniquePlayerItemKeys normaliza boots para boots e Botas', () => {
    const player = createPlayer();
    player.equipment.boots = buildItem('boots', 'Botas de Teste', { def: 1 });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.boots?.uiCategory, 'boots');
    assert.equal(player.equipment.boots?.displayCategory, 'Botas');
    assert.equal(player.equipment.boots?.category, 'armor');
});

test('ensureUniquePlayerItemKeys normaliza ring para rings e Anel', () => {
    const player = createPlayer();
    player.equipment.ring = buildItem('ring', 'Anel de Teste', { crit: 1 });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.ring?.uiCategory, 'rings');
    assert.equal(player.equipment.ring?.displayCategory, 'Anel');
    assert.equal(player.equipment.ring?.category, 'jewelry');
});

test('ensureUniquePlayerItemKeys normaliza necklace para necklaces e Colar', () => {
    const player = createPlayer();
    player.equipment.necklace = buildItem('necklace', 'Colar de Teste', { hp: 5 });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.necklace?.uiCategory, 'necklaces');
    assert.equal(player.equipment.necklace?.displayCategory, 'Colar');
    assert.equal(player.equipment.necklace?.category, 'jewelry');
});

test('equipar e desequipar não perde item nem muda slot', () => {
    const player = createPlayer();
    const boots = buildItem('boots', 'Botas Guardiãs', { def: 3 });
    player.inventory.push(boots);

    ensureUniquePlayerItemKeys(player);
    const inventoryKey = player.inventory[0].instanceId;

    equipItem(player, 'boots', player.inventory[0]);

    assert.equal(player.equipment.boots?.slot, 'boots');
    assert.equal(player.inventory.some(item => item.instanceId === inventoryKey), false);

    const restored = unequipItem(player, 'boots');

    assert.equal(restored?.slot, 'boots');
    assert.equal(player.equipment.boots, null);
    assert.equal(player.inventory.some(item => item.slot === 'boots'), true);
});

test('compatibilidade weapon/offhand continua funcionando', () => {
    const player = createPlayer();

    player.equipment.weapon = buildItem('weapon', 'Arco de Teste', {
        weaponStyle: 'one_handed',
        requiredOffhandType: 'quiver',
        atk: 3
    });
    player.equipment.shield = buildItem('shield', 'Escudo de Teste', {
        offhandType: 'shield',
        def: 2
    });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.weapon?.name, 'Arco de Teste');
    assert.equal(player.equipment.shield, null);
    assert.equal(player.inventory.some(item => item.name === 'Escudo de Teste'), true);
});
