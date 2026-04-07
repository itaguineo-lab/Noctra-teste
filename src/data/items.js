const { RARITIES } = require('./constants');

/*
====================================================
BALANCEAMENTO CENTRAL DO LOOT
====================================================
*/

const RARITY_MULTIPLIERS = {
    Comum: 1,
    Incomum: 1.2,
    Raro: 1.45,
    Épico: 1.8,
    Lendário: 2.2,
    Mítico: 2.8
};

const RARITY_POWER_BONUS = {
    Comum: 0,
    Incomum: 3,
    Raro: 7,
    Épico: 14,
    Lendário: 24,
    Mítico: 40
};

const itemTypes = [
    {
        slot: 'weapon',
        namePrefix: 'Espada',
        atkBase: 6,
        defBase: 0,
        critBase: 2,
        hpBase: 0
    },
    {
        slot: 'armor',
        namePrefix: 'Armadura',
        atkBase: 0,
        defBase: 6,
        critBase: 0,
        hpBase: 12
    },
    {
        slot: 'necklace',
        namePrefix: 'Amuleto',
        atkBase: 3,
        defBase: 2,
        critBase: 3,
        hpBase: 6
    },
    {
        slot: 'ring',
        namePrefix: 'Anel',
        atkBase: 4,
        defBase: 1,
        critBase: 4,
        hpBase: 4
    },
    {
        slot: 'boots',
        namePrefix: 'Bota',
        atkBase: 0,
        defBase: 4,
        critBase: 2,
        hpBase: 5
    }
];

const mapRarityRules = {
    clareira_sombria: ['Comum', 'Incomum'],
    cripta_em_ruinas: ['Incomum', 'Raro'],
    pantano_corrompido: ['Raro', 'Épico'],
    deserto_incandescente: ['Épico', 'Lendário']
};

/*
====================================================
UTILS
====================================================
*/

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedChoice(list) {
    const weights = {
        Comum: 40,
        Incomum: 30,
        Raro: 18,
        Épico: 8,
        Lendário: 3,
        Mítico: 1
    };

    const pool = [];

    list.forEach(rarity => {
        const weight = weights[rarity] || 1;

        for (let i = 0; i < weight; i++) {
            pool.push(rarity);
        }
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
        if (roll <= 20) return 'Lendário';
        return 'Épico';
    }

    switch (currentMap) {
        case 'clareira_sombria':
            return roll <= 20 ? 'Raro' : 'Incomum';

        case 'cripta_em_ruinas':
            return roll <= 15 ? 'Lendário' : 'Épico';

        case 'pantano_corrompido':
            return roll <= 20 ? 'Lendário' : 'Épico';

        case 'deserto_incandescente':
            return roll <= 25 ? 'Lendário' : 'Épico';

        default:
            return 'Comum';
    }
}

/*
====================================================
ROLL DE STATS
====================================================
*/

function rollStat(base, rarity, varianceMin = 0.92, varianceMax = 1.08) {
    const multiplier = RARITY_MULTIPLIERS[rarity] || 1;
    const variance = randomBetween(
        Math.floor(varianceMin * 100),
        Math.floor(varianceMax * 100)
    ) / 100;

    return Math.max(0, Math.round(base * multiplier * variance));
}

function calculatePower(item) {
    const atk = item.atk || 0;
    const def = item.def || 0;
    const hp = item.hp || 0;
    const crit = item.crit || 0;

    const rarityBonus = RARITY_POWER_BONUS[item.rarity] || 0;

    return Math.round(
        atk * 2.4 +
        def * 1.8 +
        hp * 0.6 +
        crit * 3 +
        rarityBonus
    );
}

/*
====================================================
GERADOR PRINCIPAL
====================================================
*/

function generateItem(playerLevel, forcedType = null, options = {}) {
    const {
        currentMap = 'clareira_sombria',
        isBoss = false,
        isDungeonBoss = false
    } = options;

    const type = forcedType
        ? itemTypes.find(t => t.slot === forcedType) || itemTypes[0]
        : itemTypes[Math.floor(Math.random() * itemTypes.length)];

    const rarity = isBoss
        ? getBossRarity(currentMap, isDungeonBoss)
        : getMapRarity(currentMap);

    const levelScaling = Math.max(1, Math.floor(playerLevel * 0.9));

    const atk = rollStat(type.atkBase + levelScaling, rarity);
    const def = rollStat(type.defBase + levelScaling, rarity);
    const crit = rollStat(type.critBase + Math.floor(levelScaling / 2), rarity);
    const hp = rollStat(type.hpBase + levelScaling * 2, rarity);

    const item = {
        id: `item_${Date.now()}_${Math.floor(Math.random() * 999999)}`,
        name: `${type.namePrefix} ${rarity}`,
        slot: type.slot,
        rarity,
        level: playerLevel,
        atk,
        def,
        crit,
        hp,
        emoji: RARITIES[rarity]?.emoji || '⚪'
    };

    item.power = calculatePower(item);

    item.price = Math.floor(item.power * 8);

    return item;
}

module.exports = {
    itemTypes,
    generateItem,
    getMapRarity,
    getBossRarity
};