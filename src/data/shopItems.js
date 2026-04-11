const shopItems = [
    /*
    =================================
    VILA — APENAS CONSUMÍVEIS BÁSICOS (OURO)
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
        description: 'Restaura 100% do HP máximo.'
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
        description: '+10 ATK por 30 minutos.'
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
        description: '+10 DEF por 30 minutos.'
    },

    /*
    =================================
    CASTELO — PREMIUM (NOX)
    =================================
    */

    {
        id: 'energy_potion',
        name: 'Poção de Energia',
        shop: 'castle',
        type: 'consumable',
        effect: 'potionEnergy',
        value: 1,
        currency: 'nox',
        price: 3,
        description: 'Recupera 1 energia instantaneamente.'
    },

    {
        id: 'dungeon_key',
        name: 'Chave de Masmorra',
        shop: 'castle',
        type: 'consumable',
        effect: 'keys',
        value: 1,
        currency: 'nox',
        price: 5,
        description: 'Entrada instantânea na masmorra.'
    },

    {
        id: 'energy_refill_10',
        name: 'Recarga de Energia (+10)',
        shop: 'castle',
        type: 'consumable',
        effect: 'energyRefill',
        value: 10,
        currency: 'nox',
        price: 8,
        description: 'Recupera 10 de energia.'
    },

    {
        id: 'vip_7d',
        name: 'VIP 7 Dias',
        shop: 'castle',
        type: 'vip',
        days: 7,
        currency: 'nox',
        price: 25,
        description: '⚡ Energia 40 | 🎒 +10 slots | 💰 +50% XP/Ouro'
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
    ARENA — GLÓRIAS
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
    }
];

module.exports = {
    shopItems
};