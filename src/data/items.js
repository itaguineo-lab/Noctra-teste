const { RARITIES, getRarityMult } = require('./constants');

const itemTypes = [
    {
        slot: 'weapon',
        namePrefix: 'Espada',
        atkBase: 5,
        defBase: 0,
        critBase: 2,
        hpBase: 0,
        variance: 0.18
    },
    {
        slot: 'armor',
        namePrefix: 'Armadura',
        atkBase: 0,
        defBase: 5,
        critBase: 0,
        hpBase: 10,
        variance: 0.15
    },
    {
        slot: 'necklace',
        namePrefix: 'Amuleto',
        atkBase: 2,
        defBase: 1,
        critBase: 3,
        hpBase: 5,
        variance: 0.16
    },
    {
        slot: 'ring',
        namePrefix: 'Anel',
        atkBase: 3,
        defBase: 0,
        critBase: 4,
        hpBase: 3,
        variance: 0.17
    },
    {
        slot: 'boots',
        namePrefix: 'Bota',
        atkBase: 0,
        defBase: 3,
        critBase: 1,
        hpBase: 4,
        variance: 0.14
    }
];

const mapRarityRules = {
    clareira_sombria: ['Comum', 'Incomum'],
    cripta_em_ruinas: ['Incomum', 'Raro'],
    pantano_corrompido: ['Raro', 'Épico'],
    deserto_incandescente: ['Épico', 'Lendário']
};

const rarityPowerBonus = {
    Comum: 1.0,
    Incomum: 1.15,
    Raro: 1.35,
    Épico: 1.6,
    Lendário: 2.0,
    Mítico: 2.5
};

function weightedChoice(list) {
    const pool = [];

    list.forEach(rarity => {
        const weight = Math.floor(RARITIES[rarity].weight);

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
        if (roll <= 25) return 'Lendário';
        return 'Épico';
    }

    switch (currentMap) {
        case 'clareira_sombria':
            return roll <= 20 ? 'Raro' : 'Incomum';

        case 'cripta_em_ruinas':
            return roll <= 10 ? 'Lendário' : 'Épico';

        case 'pantano_corrompido':
            return roll <= 15 ? 'Lendário' : 'Épico';

        case 'deserto_incandescente':
            return roll <= 25 ? 'Lendário' : 'Épico';

        default:
            return 'Comum';
    }
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollStat(base, mult, variance) {
    const low = Math.floor(base * mult * (1 - variance));
    const high = Math.ceil(base * mult * (1 + variance));

    return Math.max(0, randomBetween(low, high));
}

function calculatePower(item) {
    const atk = item.atk || 0;
    const def = item.def || 0;
    const hp = item.hp || 0;
    const crit = item.crit || 0;

    return Math.max(
        1,
        Math.round(
            atk * 2.2 +
            def * 1.8 +
            hp * 0.45 +
            crit * 3.2
        )
    );
}

function buildPowerTier(power) {
    if (power <= 20) return 'Fraco';
    if (power <= 40) return 'Bom';
    if (power <= 70) return 'Forte';
    if (power <= 100) return 'Elite';
    return 'Lendário';
}

function generateItem(playerLevel, forcedType = null, options = {}) {
    const {
        currentMap = 'clareira_sombria',
        isBoss = false,
        isDungeonBoss = false
    } = options;

    const type = forcedType
        ? itemTypes.find(t => t.slot === forcedType) || itemTypes[0]
        : itemTypes[Math.floor(Math.random() * itemTypes.length)];

    const rarityName = isBoss
        ? getBossRarity(currentMap, isDungeonBoss)
        : getMapRarity(currentMap);

    const rarityMult = getRarityMult(rarityName);
    const powerBonus = rarityPowerBonus[rarityName] || 1;

    const levelScaling = Math.max(1, Math.floor(playerLevel * 0.85));

    const atk = rollStat(
        type.atkBase + levelScaling,
        rarityMult * powerBonus,
        type.variance
    );

    const def = rollStat(
        type.defBase + levelScaling,
        rarityMult * powerBonus,
        type.variance
    );

    const crit = rollStat(
        type.critBase + Math.floor(levelScaling / 2),
        rarityMult * powerBonus,
        type.variance
    );

    const hp = rollStat(
        type.hpBase + levelScaling * 2,
        rarityMult * powerBonus,
        type.variance
    );

    const item = {
        id: `item_${Date.now()}_${Math.floor(Math.random() * 999999)}`,
        name: `${type.namePrefix} ${rarityName}`,
        slot: type.slot,
        rarity: rarityName,
        level: playerLevel,
        atk,
        def,
        crit,
        hp,
        emoji: RARITIES[rarityName].emoji
    };

    item.power = calculatePower(item);
    item.powerTier = buildPowerTier(item.power);

    item.price = Math.floor(
        (100 + item.power * 3) * rarityMult
    );

    return item;
}

module.exports = {
    itemTypes,
    generateItem,
    getMapRarity,
    getBossRarity,
    calculatePower
};