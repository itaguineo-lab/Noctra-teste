const { RARITIES, getRarityMult } = require('./constants');

const itemTypes = [
    { slot: 'weapon', namePrefix: 'Espada', atkBase: 5, defBase: 0, critBase: 2, hpBase: 0 },
    { slot: 'armor', namePrefix: 'Armadura', atkBase: 0, defBase: 5, critBase: 0, hpBase: 10 },
    { slot: 'necklace', namePrefix: 'Amuleto', atkBase: 2, defBase: 1, critBase: 3, hpBase: 5 },
    { slot: 'ring', namePrefix: 'Anel', atkBase: 3, defBase: 0, critBase: 4, hpBase: 3 },
    { slot: 'boots', namePrefix: 'Bota', atkBase: 0, defBase: 3, critBase: 1, hpBase: 4 }
];

const mapRarityRules = {
    clareira_sombria: ['Comum', 'Incomum'],
    cripta_em_ruinas: ['Incomum', 'Raro'],
    pantano_corrompido: ['Raro', 'Épico'],
    deserto_incandescente: ['Épico', 'Lendário']
};

function weightedChoice(list) {
    const pool = [];
    list.forEach(rarity => {
        const weight = Math.floor(RARITIES[rarity].weight);
        for (let i = 0; i < weight; i++) pool.push(rarity);
    });
    return pool[Math.floor(Math.random() * pool.length)];
}

function getMapRarity(currentMap = 'clareira_sombria') {
    const allowed = mapRarityRules[currentMap] || ['Comum'];
    return weightedChoice(allowed);
}

function getBossRarity(currentMap, isDungeonBoss = false) {
    const roll = Math.random() * 100;
    if (isDungeonBoss) {
        if (roll <= 3) return 'Mítico';
        if (roll <= 25) return 'Lendário';
        return 'Épico';
    }
    switch (currentMap) {
        case 'clareira_sombria': return roll <= 20 ? 'Raro' : 'Incomum';
        case 'cripta_em_ruinas': return roll <= 10 ? 'Lendário' : 'Épico';
        case 'pantano_corrompido': return roll <= 15 ? 'Lendário' : 'Épico';
        case 'deserto_incandescente': return roll <= 25 ? 'Lendário' : 'Épico';
        default: return 'Comum';
    }
}

function generateItem(playerLevel, forcedType = null, options = {}) {
    const { currentMap = 'clareira_sombria', isBoss = false, isDungeonBoss = false } = options;
    const type = forcedType ? itemTypes.find(t => t.slot === forcedType) || itemTypes[0] : itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const rarityName = isBoss ? getBossRarity(currentMap, isDungeonBoss) : getMapRarity(currentMap);
    const mult = getRarityMult(rarityName);
    const levelBonus = Math.max(1, Math.floor(playerLevel * 0.8));
    const itemLevel = playerLevel; // nível do item = nível do jogador no momento do drop

    return {
        id: `item_${Date.now()}_${Math.floor(Math.random() * 999999)}`,
        name: `${type.namePrefix} ${rarityName}`,
        slot: type.slot,
        rarity: rarityName,
        level: itemLevel,
        atk: Math.floor((type.atkBase + levelBonus) * mult),
        def: Math.floor((type.defBase + levelBonus) * mult),
        crit: Math.floor((type.critBase + levelBonus / 2) * mult),
        hp: Math.floor((type.hpBase + levelBonus * 2) * mult),
        price: Math.floor(100 * mult * playerLevel),
        emoji: RARITIES[rarityName].emoji
    };
}

module.exports = { itemTypes, generateItem, getMapRarity, getBossRarity };