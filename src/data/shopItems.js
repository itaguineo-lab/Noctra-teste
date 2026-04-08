const shopItems = [
    /*
    =================================
    VILLAGE — SOFT + PREMIUM UTILITY
    =================================
    */

    {
        id: 'hp_potion',
        name: 'Poção de Vida',
        shop: 'village',
        type: 'consumable',
        effect: 'potionHp',
        value: 1,
        currency: 'gold',
        price: 50,
        description: 'Restaura 40% do HP máximo.'
    },

    {
        id: 'energy_potion',
        name: 'Poção de Energia',
        shop: 'village',
        type: 'consumable',
        effect: 'potionEnergy',
        value: 1,
        currency: 'gold',
        price: 80,
        description: 'Recupera energia.'
    },

    {
        id: 'strength_tonic',
        name: 'Tônico de Força',
        shop: 'village',
        type: 'consumable',
        effect: 'tonicStrength',
        value: 1,
        currency: 'gold',
        price: 120,
        description: '+10 ATK por 3 combates.'
    },

    {
        id: 'defense_tonic',
        name: 'Tônico de Defesa',
        shop: 'village',
        type: 'consumable',
        effect: 'tonicDefense',
        value: 1,
        currency: 'gold',
        price: 120,
        description: '+10 DEF por 3 combates.'
    },

    {
        id: 'dungeon_key',
        name: 'Chave de Masmorra',
        shop: 'village',
        type: 'consumable',
        effect: 'keys',
        value: 1,
        currency: 'nox',
        price: 3,
        description: 'Entrada instantânea na masmorra.'
    },

    {
        id: 'energy_refill_10',
        name: 'Recarga de Energia (+10)',
        shop: 'village',
        type: 'consumable',
        effect: 'energyRefill',
        value: 10,
        currency: 'nox',
        price: 5,
        description: 'Recupera energia instantaneamente.'
    },

    /*
    =================================
    CASTLE — PREMIUM CORE
    =================================
    */

    {
        id: 'vip_7d',
        name: 'VIP 7 Dias',
        shop: 'castle',
        type: 'vip',
        days: 7,
        currency: 'nox',
        price: 25,
        description: '⚡ Energia 40 | 🎒 +10 slots | 🎁 bônus de recompensa'
    },

    {
        id: 'vip_30d',
        name: 'VIP 30 Dias',
        shop: 'castle',
        type: 'vip',
        days: 30,
        currency: 'nox',
        price: 80,
        description: '👑 Melhor custo-benefício mensal'
    },

    {
        id: 'cosmetic_aura',
        name: 'Aura Sombria',
        shop: 'castle',
        type: 'cosmetic',
        currency: 'nox',
        price: 12,
        description: 'Efeito visual exclusivo.'
    },

    {
        id: 'cosmetic_title_shadowlord',
        name: 'Título: Shadow Lord',
        shop: 'castle',
        type: 'cosmetic',
        currency: 'nox',
        price: 15,
        description: 'Título lendário exclusivo.'
    },

    /*
    =================================
    ARENA — ENDGAME
    =================================
    */

    {
        id: 'arena_key_bundle',
        name: 'Pacote Arena x3',
        shop: 'arena',
        type: 'consumable',
        effect: 'keys',
        value: 3,
        currency: 'glorias',
        price: 2,
        description: 'Pacote competitivo.'
    },

    /*
    =================================
    PREMIUM STORE
    =================================
    */

    {
        id: 'nox_pack_small',
        name: 'Pacote NOX 50',
        shop: 'premium',
        type: 'nox_pack',
        value: 50,
        bonus: 0,
        currency: 'money',
        price: 0,
        description: 'Compra externa real.'
    },

    {
        id: 'nox_pack_medium',
        name: 'Pacote NOX 120 (+10)',
        shop: 'premium',
        type: 'nox_pack',
        value: 120,
        bonus: 10,
        currency: 'money',
        price: 0,
        description: 'Melhor custo.'
    },

    {
        id: 'nox_pack_large',
        name: 'Pacote NOX 300 (+40)',
        shop: 'premium',
        type: 'nox_pack',
        value: 300,
        bonus: 40,
        currency: 'money',
        price: 0,
        description: 'Pacote lendário.'
    }
];

module.exports = {
    shopItems
};