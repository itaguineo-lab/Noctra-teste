const shopItems = [
    {
        id: 'hp_potion',
        name: 'Poção de Vida',
        shop: 'village',
        type: 'consumable',
        effect: 'potionHp',
        value: 1,
        currency: 'gold',
        price: 50,
        description: 'Restaura 40% do HP máximo no combate.'
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
        description: 'Recupera 10 de energia.'
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
        id: 'vip_7d',
        name: 'VIP 7 Dias',
        shop: 'castle',
        type: 'vip',
        days: 7,
        currency: 'nox',
        price: 15,
        description: 'Energia 40, regen 8 min, +10 slots, +50% recompensas.'
    },
    {
        id: 'vip_30d',
        name: 'VIP 30 Dias',
        shop: 'castle',
        type: 'vip',
        days: 30,
        currency: 'nox',
        price: 50,
        description: 'Energia 40, regen 8 min, +10 slots, +50% recompensas.'
    },
    {
        id: 'cosmetic_aura',
        name: 'Aura Sombria',
        shop: 'castle',
        type: 'cosmetic',
        currency: 'nox',
        price: 8,
        description: 'Efeito visual exclusivo.'
    }
];

module.exports = { shopItems };