const test = require('node:test');
const assert = require('node:assert/strict');

const {
    equipItem,
    ensureUniquePlayerItemKeys,
    getOffhandCompatibilityIssue
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

function weapon(name, extra = {}) {
    return {
        id: `id_${name}`,
        instanceId: `iid_${name}`,
        name,
        slot: 'weapon',
        level: 1,
        rarity: 'Comum',
        atk: 1,
        def: 0,
        hp: 0,
        crit: 0,
        ...extra
    };
}

function offhand(name, extra = {}) {
    return {
        id: `id_${name}`,
        instanceId: `iid_${name}`,
        name,
        slot: 'shield',
        level: 1,
        rarity: 'Comum',
        atk: 0,
        def: 1,
        hp: 0,
        crit: 0,
        ...extra
    };
}

test('arco não permanece equipado junto com escudo', () => {
    const player = createPlayer();

    player.equipment.weapon = weapon('Arco de Teste', {
        weaponStyle: 'one_handed',
        requiredOffhandType: 'quiver'
    });

    player.equipment.shield = offhand('Escudo de Teste', {
        offhandType: 'shield'
    });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.weapon?.name, 'Arco de Teste');
    assert.equal(player.equipment.shield, null);
    assert.equal(player.inventory.some(item => item.name === 'Escudo de Teste'), true);
});

test('arco permanece equipado junto com aljava', () => {
    const player = createPlayer();

    player.equipment.weapon = weapon('Arco de Teste', {
        weaponStyle: 'one_handed',
        requiredOffhandType: 'quiver'
    });

    player.equipment.shield = offhand('Aljava de Teste', {
        offhandType: 'quiver'
    });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.weapon?.name, 'Arco de Teste');
    assert.equal(player.equipment.shield?.name, 'Aljava de Teste');
});

test('equipar escudo com arco equipado remove o arco para manter build válida', () => {
    const player = createPlayer();

    player.equipment.weapon = weapon('Arco de Teste', {
        weaponStyle: 'one_handed',
        requiredOffhandType: 'quiver'
    });

    player.inventory.push(offhand('Escudo de Teste', {
        offhandType: 'shield'
    }));

    equipItem(player, 'shield', player.inventory[0]);

    assert.equal(player.equipment.weapon, null);
    assert.equal(player.equipment.shield?.name, 'Escudo de Teste');
    assert.equal(player.inventory.some(item => item.name === 'Arco de Teste'), true);
});

test('varinha não combina com escudo; exige orbe', () => {
    const issue = getOffhandCompatibilityIssue(
        weapon('Varinha de Teste', {
            weaponStyle: 'one_handed',
            requiredOffhandType: 'orb'
        }),
        offhand('Escudo de Teste', {
            offhandType: 'shield'
        })
    );

    assert.match(issue, /Orbe/);
    assert.match(issue, /Escudo/);
});

test('arma de duas mãos não permanece com mão secundária', () => {
    const player = createPlayer();

    player.equipment.weapon = weapon('Machado de Teste', {
        weaponStyle: 'two_handed'
    });

    player.equipment.shield = offhand('Escudo de Teste', {
        offhandType: 'shield'
    });

    ensureUniquePlayerItemKeys(player);

    assert.equal(player.equipment.weapon?.name, 'Machado de Teste');
    assert.equal(player.equipment.shield, null);
    assert.equal(player.inventory.some(item => item.name === 'Escudo de Teste'), true);
});
