const { BALANCE } = require('./balance');

const hpCfg = BALANCE.consumables.potionHp;
const strCfg = BALANCE.consumables.tonicStrength;
const defCfg = BALANCE.consumables.tonicDefense;
const energyCfg = BALANCE.consumables.potionEnergy;

const shopItems = [
    /*
    =================================
    VILA — CONSUMÍVEIS BÁSICOS (OURO)
    =================================
    */

    {
        id: 'hp_potion',
        name: hpCfg.label,
        shop: 'village',
        type: 'consumable',
        effect: 'potionHp',
        value: 1,
        currency: 'gold',
        price: 120,
        description: 'Adiciona 1 poção ao inventário. Use em batalha ou fora dela para restaurar 100% do HP máximo.'
    },
    {
        id: 'strength_tonic',
        name: strCfg.label,
        shop: 'village',
        type: 'consumable',
        effect: 'tonicStrength',
        value: 1,
        currency: 'gold',
        price: 150,
        description: `Adiciona 1 tônico ao inventário. Em batalha, concede +${strCfg.atkBonus} ATK durante a luta atual.`
    },
    {
        id: 'defense_tonic',
        name: defCfg.label,
        shop: 'village',
        type: 'consumable',
        effect: 'tonicDefense',
        value: 1,
        currency: 'gold',
        price: 150,
        description: `Adiciona 1 tônico ao inventário. Em batalha, concede +${defCfg.defBonus} DEF durante a luta atual.`
    },

    /*
    =================================
    CASTELO — CONVENIÊNCIA (NOX)
    =================================
    */

    {
        id: 'energy_potion',
        name: energyCfg.label,
        shop: 'castle',
        type: 'consumable',
        effect: 'potionEnergy',
        value: energyCfg.restoreAmount,
        currency: 'nox',
        price: 4,
        description: `Adiciona 1 poção ao inventário. Use quando quiser recuperar ${energyCfg.restoreAmount} energia.`
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
        description: 'Recupera 10 de energia imediatamente no momento da compra.'
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
        description: `⚡ Energia ${BALANCE.energy.vipMax} | 🎒 +${BALANCE.inventory.vipMax - BALANCE.inventory.baseMax} slots | regeneração melhorada`
    },
    {
        id: 'vip_30d',
        name: 'VIP 30 Dias',
        shop: 'castle',
        type: 'vip',
        days: 30,
        currency: 'nox',
        price: 89,
        description: '👑 Melhor custo-benefício mensal. Ativa VIP por 30 dias e soma duração se você já for VIP.'
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
        description: 'Efeito visual sombrio exclusivo. Permanente após desbloqueio.'
    },
    {
        id: 'cosmetic_title_shadowlord',
        name: 'Título: Shadow Lord',
        shop: 'castle',
        type: 'cosmetic',
        cosmeticType: 'title',
        currency: 'nox',
        price: 15,
        description: 'Título lendário exclusivo. Permanente após desbloqueio.'
    },
    {
        id: 'cosmetic_badge_moon',
        name: 'Emblema Lunar',
        shop: 'castle',
        type: 'cosmetic',
        cosmeticType: 'badge',
        currency: 'nox',
        price: 10,
        description: 'Emblema raro para o perfil. Permanente após desbloqueio.'
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
        price: 3,
        description: 'Recupera 5 de energia imediatamente no momento da compra.'
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
        description: `Adiciona 2 ${strCfg.label}s ao inventário.`
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
        description: `Adiciona 2 ${defCfg.label}s ao inventário.`
    }

    /*
    Chave de masmorra segue fora da loja:
    recurso raro de progressão, não commodity premium.
    */
];

module.exports = {
    shopItems
};
