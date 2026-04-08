const arenaShopItems = [
    {
        id: 'arena_hp_potion',
        name: 'Poção de Vida Arena',
        type: 'consumable',
        effect: 'potionHp',
        value: 1,
        price: 30,
        description: 'Recupera HP em batalhas.'
    },
    {
        id: 'arena_energy_refill',
        name: 'Carga de Energia',
        type: 'energy',
        value: 5,
        price: 50,
        description: '+5 energia instantânea.'
    },
    {
        id: 'arena_key',
        name: 'Chave de Arena',
        type: 'key',
        value: 1,
        price: 80,
        description: 'Chave rara.'
    },
    {
        id: 'arena_title_bronze',
        name: 'Título Gladiador',
        type: 'cosmetic',
        value: 'Gladiador',
        price: 120,
        description: 'Título exclusivo da arena.'
    },
    {
        id: 'arena_skin_shadow',
        name: 'Aura do Campeão',
        type: 'cosmetic',
        value: 'Aura do Campeão',
        price: 180,
        description: 'Cosmético exclusivo.'
    }
];

module.exports = {
    arenaShopItems
};