const { RARITY_MULT, RARITY_EMOJIS } = require('./constants');

const raridades = [
    { name: "Comum", chance: 45, price: 10 },
    { name: "Incomum", chance: 30, price: 25 },
    { name: "Raro", chance: 15, price: 60 },
    { name: "Épico", chance: 7, price: 150 },
    { name: "Lendário", chance: 2.5, price: 400 },
    { name: "Mítico", chance: 0.5, price: 1000 }
];

const itemTypes = [
    {
        slot: 'weapon',
        namePrefix: 'Espada',
        atkBase: 5,
        defBase: 0,
        critBase: 2,
        hpBase: 0
    },
    {
        slot: 'armor',
        namePrefix: 'Armadura',
        atkBase: 0,
        defBase: 5,
        critBase: 0,
        hpBase: 10
    },
    {
        slot: 'accessory',
        namePrefix: 'Amuleto',
        atkBase: 2,
        defBase: 1,
        critBase: 3,
        hpBase: 5
    }
];

function getRarity() {
    const roll = Math.random() * 100;
    let total = 0;
    for (const r of raridades) {
        total += r.chance;
        if (roll <= total) return r;
    }
    return raridades[0];
}

/**
 * Gera um item aleatório baseado no nível do jogador
 * @param {number} playerLevel Nível do jogador para escalar os status
 * @param {string} forcedType (Opcional) Forçar um slot específico
 */
function generateItem(playerLevel, forcedType = null) {
    const type = forcedType 
        ? itemTypes.find(t => t.slot === forcedType) || itemTypes[0]
        : itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    const rarity = getRarity();
    const mult = RARITY_MULT[rarity.name];
    
    // Escalonamento por nível: Base + (Nível * 0.5)
    const levelBonus = Math.floor(playerLevel * 0.7);

    // Criação do objeto do item
    return {
        id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`, // ID único string
        name: `${type.namePrefix} de ${rarity.name}`,
        slot: type.slot,
        rarity: rarity.name,
        atk: Math.floor((type.atkBase + levelBonus) * mult),
        def: Math.floor((type.defBase + levelBonus) * mult),
        crit: Math.floor((type.critBase + (levelBonus / 2)) * mult),
        hp: Math.floor((type.hpBase + (levelBonus * 2)) * mult),
        price: Math.floor(rarity.price * (1 + playerLevel * 0.1)),
        emoji: RARITY_EMOJIS[rarity.name]
    };
}

module.exports = { 
    raridades, 
    itemTypes, 
    generateItem 
};
