const { BALANCE } = require('./balance');

const arenaShopItems = [
    /*
    =================================
    TÁTICOS — GLÓRIAS
    =================================
    */

    {
        id: 'arena_hp_potion',
        name: `${BALANCE.consumables.potionHp.label} Arena`,
        type: 'consumable',
        effect: 'potionHp',
        value: 1,
        price: 3,
        description: 'Adiciona 1 Poção de Vida ao inventário. Uso tático para manter ritmo competitivo.'
    },
    {
        id: 'arena_strength_tonic',
        name: `${BALANCE.consumables.tonicStrength.label} Arena`,
        type: 'consumable',
        effect: 'tonicStrength',
        value: 1,
        price: 4,
        description: 'Adiciona 1 Tônico de Força ao inventário. Bônus tático durante a luta atual.'
    },
    {
        id: 'arena_defense_tonic',
        name: `${BALANCE.consumables.tonicDefense.label} Arena`,
        type: 'consumable',
        effect: 'tonicDefense',
        value: 1,
        price: 4,
        description: 'Adiciona 1 Tônico de Defesa ao inventário. Bônus tático durante a luta atual.'
    },

    /*
    =================================
    CONVENIÊNCIA — MODERADA
    =================================
    */

    {
        id: 'arena_energy_refill',
        name: 'Carga de Energia',
        type: 'energy',
        value: 5,
        price: 6,
        description: 'Recupera 5 de energia imediatamente. Conveniência moderada, não poder direto.'
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
        price: 18,
        description: 'Título exclusivo da arena. Prestígio visual permanente.'
    },
    {
        id: 'arena_badge_bloodmoon',
        name: 'Emblema Lua de Sangue',
        type: 'cosmetic',
        cosmeticType: 'badge',
        value: 'Lua de Sangue',
        price: 24,
        description: 'Emblema raro de prestígio competitivo. Permanente.'
    },
    {
        id: 'arena_aura_champion',
        name: 'Aura do Campeão',
        type: 'cosmetic',
        cosmeticType: 'aura',
        value: 'Aura do Campeão',
        price: 36,
        description: 'Cosmético exclusivo para jogadores consistentes. Permanente.'
    }
];

/*
=================================
DECISÃO DE PRODUTO
=================================
- Loja da Arena usa Glórias como moeda oficial competitiva.
- arena.coins antigo é migrado para Glórias no acesso à loja.
- chave foi removida da loja da arena.
- arena não deve virar atalho lateral para dungeon.
- arena serve prestígio, utilidade tática moderada e cosméticos competitivos.
=================================
*/

module.exports = {
    arenaShopItems
};
