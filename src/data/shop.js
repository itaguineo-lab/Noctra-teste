const villageItems = [
    {
        id: 'hp_potion',
        name: 'Poção de Vida',
        type: 'consumable',
        effect: 'hp',
        quantity: 1,
        currency: 'gold',
        price: 50
    },
    {
        id: 'energy_potion',
        name: 'Poção de Energia',
        type: 'consumable',
        effect: 'energy',
        quantity: 1,
        currency: 'gold',
        price: 60
    },
    {
        id: 'strength_tonic',
        name: 'Tônico de Força',
        type: 'consumable',
        effect: 'buff_atk',
        quantity: 1,
        currency: 'gold',
        price: 120
    }
];

const castleItems = [
    {
        id: 'vip_7d',
        name: 'VIP 7 Dias',
        type: 'vip',
        days: 7,
        currency: 'nox',
        price: 18
    },
    {
        id: 'castle_key',
        name: 'Chave Sombria',
        type: 'key',
        value: 1,
        currency: 'nox',
        price: 5
    }
];

const arenaItems = [
    {
        id: 'arena_blade',
        name: 'Lâmina da Arena',
        type: 'equipment',
        slot: 'weapon',
        atk: 25,
        def: 5,
        crit: 5,
        currency: 'glory',
        price: 100
    },
    {
        id: 'arena_armor',
        name: 'Armadura do Campeão',
        type: 'equipment',
        slot: 'armor',
        atk: 0,
        def: 20,
        hp: 50,
        currency: 'glory',
        price: 120
    }
];

module.exports = {
    villageItems,
    castleItems,
    arenaItems
};