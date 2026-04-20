const { BALANCE } = require('./balance');

const arenaShopItems = [
    /*
    =================================
    TÁTICOS — USO IMEDIATO
    =================================
    */

    {
        id: 'arena_hp_potion',
        name: `${BALANCE.consumables.potionHp.label} Arena`,
        type: 'consumable',
        effect: 'potionHp',
        value: 1,
        price: 25,
        description: `Recupera HP com força moderada, sem quebrar o competitivo.`
    },
    {
        id: 'arena_strength_tonic',
        name: `${BALANCE.consumables.tonicStrength.label} Arena`,
        type: 'consumable',
        effect: 'tonicStrength',
        value: 1,
        price: 40,
        description: `Bônus tático de ATK inspirado no tuning competitivo.`
    },
    {
        id: 'arena_defense_tonic',
        name: `${BALANCE.consumables.tonicDefense.label} Arena`,
        type: 'consumable',
        effect: 'tonicDefense',
        value: 1,
        price: 40,
        description: `Bônus tático de DEF inspirado no tuning competitivo.`
    },

    /*
    =================================
    CONVENIÊNCIA — LIMITADA
    =================================
    */

    {
        id: 'arena_energy_refill',
        name: 'Carga de Energia',
        type: 'energy',
        value: 5,
        price: 60,
        description: 'Recupera 5 de energia instantaneamente.'
    },

    /*
    =================================
    PRESTÍGIO — COSMÉTICOS
    =================================
    */

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
        id: 'arena_badge_bloodmoon',
        name: 'Emblema Lua de Sangue',
        type: 'cosmetic',
        cosmeticType: 'badge',
        value: 'Lua de Sangue',
        price: 150,
        description: 'Emblema raro de prestígio competitivo.'
    },
    {
        id: 'arena_aura_champion',
        name: 'Aura do Campeão',
        type: 'cosmetic',
        cosmeticType: 'aura',
        value: 'Aura do Campeão',
        price: 220,
        description: 'Cosmético exclusivo para os mais consistentes.'
    }
];

/*
=================================
DECISÃO DE PRODUTO
=================================
- chave foi removida da loja da arena
- arena não deve virar atalho lateral para dungeon
- arena serve prestígio, baús, moeda competitiva e tático moderado
=================================
*/

module.exports = {
    arenaShopItems
};