const shopItems = [
    /*
    =================================
    VILA — CONSUMÍVEIS BÁSICOS (OURO)
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
        price: 70,
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
        price: 160,
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
        price: 160,
        description: '+10 DEF por 30 minutos.'
    },

    /*
    =================================
    CASTELO — CONVENIÊNCIA (NOX)
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
        id: 'energy_refill_10',
        name: 'Recarga de Energia (+10)',
        shop: 'castle',
        type: 'consumable',
        effect: 'energyRefill',
        value: 10,
        currency: 'nox',
        price: 10,
        description: 'Recupera 10 de energia.'
    },
    {
        id: 'dungeon_key',
        name: 'Chave de Masmorra',
        shop: 'castle',
        type: 'consumable',
        effect: 'keys',
        value: 1,
        currency: 'nox',
        price: 6,
        description: 'Entrada instantânea na masmorra.'
    },

    /*
    =================================
    CASTELO — VIP / QOL (NOX)
    =================================
    */

    {
        id: 'vip_7d',
        name: 'VIP 7 Dias',
        shop: 'castle',
        type: 'vip',
        days: 7,
        currency: 'nox',
        price: 29,
        description: '⚡ Energia 40 | 🎒 +10 slots | regeneração melhorada'
    },
    {
        id: 'vip_30d',
        name: 'VIP 30 Dias',
        shop: 'castle',
        type: 'vip',
        days: 30,
        currency: 'nox',
        price: 89,
        description: '👑 Melhor custo-benefício mensal'
    },

    /*
    =================================
    CASTELO — COSMÉTICOS PREMIUM
    =================================
    */

    {
        id: 'cosmetic_aura_shadow',
        name: 'Aura Sombria',
        shop: 'castle',
        type: 'cosmetic',
        cosmeticType: 'aura',
        currency: 'nox',
        price: 12,
        description: 'Efeito visual sombrio exclusivo.'
    },
    {
        id: 'cosmetic_title_shadowlord',
        name: 'Título: Shadow Lord',
        shop: 'castle',
        type: 'cosmetic',
        cosmeticType: 'title',
        currency: 'nox',
        price: 15,
        description: 'Título lendário exclusivo.'
    },
    {
        id: 'cosmetic_badge_moon',
        name: 'Emblema Lunar',
        shop: 'castle',
        type: 'cosmetic',
        cosmeticType: 'badge',
        currency: 'nox',
        price: 10,
        description: 'Emblema raro para o perfil.'
    },

    /*
    =================================
    ARENA — RECURSOS TÁTICOS (GLÓRIAS)
    =================================
    */

    {
        id: 'arena_energy_single',
        name: 'Carga Tática',
        shop: 'arena',
        type: 'consumable',
        effect: 'energyRefill',
        value: 5,
        currency: 'glorias',
        price: 2,
        description: 'Recupera 5 de energia.'
    },
    {
        id: 'arena_strength_pack',
        name: 'Kit de Força',
        shop: 'arena',
        type: 'consumable',
        effect: 'tonicStrength',
        value: 2,
        currency: 'glorias',
        price: 3,
        description: '2 Tônicos de Força.'
    },
    {
        id: 'arena_defense_pack',
        name: 'Kit de Defesa',
        shop: 'arena',
        type: 'consumable',
        effect: 'tonicDefense',
        value: 2,
        currency: 'glorias',
        price: 3,
        description: '2 Tônicos de Defesa.'
    },
    {
        id: 'arena_key_bundle',
        name: 'Pacote Arena x2',
        shop: 'arena',
        type: 'consumable',
        effect: 'keys',
        value: 2,
        currency: 'glorias',
        price: 3,
        description: 'Pacote competitivo de chaves.'
    }
];

module.exports = {
    shopItems
};