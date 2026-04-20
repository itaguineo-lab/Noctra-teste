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
        price: 140,
        description: `Restaura até ${Math.round(hpCfg.outsideCombatHealPercent * 100)}% do HP máximo.`
    },
    {
        id: 'strength_tonic',
        name: strCfg.label,
        shop: 'village',
        type: 'consumable',
        effect: 'tonicStrength',
        value: 1,
        currency: 'gold',
        price: 180,
        description: `+${strCfg.atkBonus} ATK por ${strCfg.durationMinutes} minutos.`
    },
    {
        id: 'defense_tonic',
        name: defCfg.label,
        shop: 'village',
        type: 'consumable',
        effect: 'tonicDefense',
        value: 1,
        currency: 'gold',
        price: 180,
        description: `+${defCfg.defBonus} DEF por ${defCfg.durationMinutes} minutos.`
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
        description: `Recupera ${energyCfg.restoreAmount} energia instantaneamente.`
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
        price: 3,
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
        description: `2 ${strCfg.label}s.`
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
        description: `2 ${defCfg.label}s.`
    }

    /*
    Chave de masmorra segue fora da loja:
    recurso raro de progressão, não commodity premium.
    */
];

module.exports = {
    shopItems
};