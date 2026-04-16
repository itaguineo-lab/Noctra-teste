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
        id: 'arena_strength_tonic',
        name: 'Tônico de Força Arena',
        type: 'consumable',
        effect: 'tonicStrength',
        value: 1,
        price: 65,
        description: '+ATK para batalhas decisivas.'
    },
    {
        id: 'arena_defense_tonic',
        name: 'Tônico de Defesa Arena',
        type: 'consumable',
        effect: 'tonicDefense',
        value: 1,
        price: 65,
        description: '+DEF para sobrevivência na arena.'
    },
    {
        id: 'arena_title_gladiador',
        name: 'Título Gladiador',
        type: 'cosmetic',
        cosmeticType: 'title',
        value: 'Gladiador',
        price: 120,
        description: 'Título exclusivo da arena.'
    },
    {
        id: 'arena_aura_champion',
        name: 'Aura do Campeão',
        type: 'cosmetic',
        cosmeticType: 'aura',
        value: 'Aura do Campeão',
        price: 180,
        description: 'Cosmético exclusivo para campeões.'
    },
    {
        id: 'arena_badge_bloodmoon',
        name: 'Emblema Lua de Sangue',
        type: 'cosmetic',
        cosmeticType: 'badge',
        value: 'Lua de Sangue',
        price: 150,
        description: 'Emblema raro de prestígio.'
    }
];

module.exports = {
    arenaShopItems
};