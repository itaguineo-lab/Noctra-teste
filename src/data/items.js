const ITEM_POOL = {
    level1: {
        weapon: [
            { name: 'Espada do Vigia', class: 'guerreiro', emoji: '🗡️' },
            { name: 'Machado Brutal', class: 'guerreiro', emoji: '🪓' },
            { name: 'Arco do Caçador', class: 'arqueiro', emoji: '🏹' },
            { name: 'Lança do Batedor', class: 'arqueiro', emoji: '🔱' },
            { name: 'Varinha Arcana', class: 'mago', emoji: '🪄' },
            { name: 'Grimório Antigo', class: 'mago', emoji: '📘' },
            { name: 'Orbe Azul', class: 'mago', emoji: '🔮' }
        ],
        armor: [
            { name: 'Armadura do Soldado', class: null, emoji: '🥋', forcedSlot: 'armor' },
            { name: 'Escudo de Ferro', class: null, emoji: '🛡️', forcedSlot: 'shield' },
            { name: 'Botas de Couro', class: null, emoji: '👢', forcedSlot: 'boots' }
        ],
        jewelry: [
            { name: 'Anel Comum', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto Comum', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level6: {
        weapon: [
            { name: 'Espada da Névoa', class: 'guerreiro', emoji: '🗡️' },
            { name: 'Machado do Eco', class: 'guerreiro', emoji: '🪓' },
            { name: 'Arco das Folhas Mortas', class: 'arqueiro', emoji: '🏹' },
            { name: 'Lança da Penumbra', class: 'arqueiro', emoji: '🔱' },
            { name: 'Cajado dos Murmúrios', class: 'mago', emoji: '🪄' },
            { name: 'Grimório da Cinza', class: 'mago', emoji: '📘' },
            { name: 'Orbe do Véu', class: 'mago', emoji: '🔮' }
        ],
        armor: [
            { name: 'Couraça da Névoa', class: null, emoji: '🥋', forcedSlot: 'armor' },
            { name: 'Escudo Sombrio', class: null, emoji: '🛡️', forcedSlot: 'shield' },
            { name: 'Botas da Sombra', class: null, emoji: '👢', forcedSlot: 'boots' }
        ],
        jewelry: [
            { name: 'Anel da Névoa', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto Espectral', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level12: {
        weapon: [
            { name: 'Espada Tumular', class: 'guerreiro', emoji: '🗡️' },
            { name: 'Machado Carniceiro', class: 'guerreiro', emoji: '🪓' },
            { name: 'Arco dos Ossos', class: 'arqueiro', emoji: '🏹' },
            { name: 'Lança Élfica', class: 'arqueiro', emoji: '🔱' },
            { name: 'Cajado Tumular', class: 'mago', emoji: '🪄' },
            { name: 'Grimório das Almas', class: 'mago', emoji: '📘' },
            { name: 'Orbe do Vazio', class: 'mago', emoji: '🔮' }
        ],
        armor: [
            { name: 'Armadura do Cavaleiro Negro', class: null, emoji: '🥋', forcedSlot: 'armor' },
            { name: 'Escudo do Corvo', class: null, emoji: '🛡️', forcedSlot: 'shield' },
            { name: 'Botas Sombrias', class: null, emoji: '👢', forcedSlot: 'boots' }
        ],
        jewelry: [
            { name: 'Anel Incomum', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto Incomum', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level18: {
        weapon: [
            { name: 'Espada do Eclipse', class: 'guerreiro', emoji: '🗡️' },
            { name: 'Machado do Caos', class: 'guerreiro', emoji: '🪓' },
            { name: 'Arco Lunar', class: 'arqueiro', emoji: '🏹' },
            { name: 'Lança da Maré Sombria', class: 'arqueiro', emoji: '🔱' },
            { name: 'Cajado de Noctra', class: 'mago', emoji: '🪄' },
            { name: 'Grimório do Eclipse', class: 'mago', emoji: '📘' },
            { name: 'Orbe da Eternidade', class: 'mago', emoji: '🔮' }
        ],
        armor: [
            { name: 'Armadura do Eclipse', class: null, emoji: '🥋', forcedSlot: 'armor' },
            { name: 'Escudo do Abismo', class: null, emoji: '🛡️', forcedSlot: 'shield' },
            { name: 'Botas do Vazio', class: null, emoji: '👢', forcedSlot: 'boots' }
        ],
        jewelry: [
            { name: 'Anel Épico', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto Lendário', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level26: {
        weapon: [
            { name: 'Espada da Citadela', class: 'guerreiro', emoji: '🗡️' },
            { name: 'Machado do Cometa', class: 'guerreiro', emoji: '🪓' },
            { name: 'Arco da Lua Partida', class: 'arqueiro', emoji: '🏹' },
            { name: 'Lança do Guardião Lunar', class: 'arqueiro', emoji: '🔱' },
            { name: 'Cajado Astral', class: 'mago', emoji: '🪄' },
            { name: 'Grimório Celeste', class: 'mago', emoji: '📘' },
            { name: 'Orbe da Maré Lunar', class: 'mago', emoji: '🔮' }
        ],
        armor: [
            { name: 'Armadura Celestial', class: null, emoji: '🥋', forcedSlot: 'armor' },
            { name: 'Escudo Lunar', class: null, emoji: '🛡️', forcedSlot: 'shield' },
            { name: 'Botas Astrais', class: null, emoji: '👢', forcedSlot: 'boots' }
        ],
        jewelry: [
            { name: 'Anel da Lua Alta', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto Estelar', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level36: {
        weapon: [
            { name: 'Espada de Noctra', class: 'guerreiro', emoji: '🗡️' },
            { name: 'Machado do Fim', class: 'guerreiro', emoji: '🪓' },
            { name: 'Arco do Abismo', class: 'arqueiro', emoji: '🏹' },
            { name: 'Lança da Ruína', class: 'arqueiro', emoji: '🔱' },
            { name: 'Cajado do Trono Vazio', class: 'mago', emoji: '🪄' },
            { name: 'Grimório do Vazio Profundo', class: 'mago', emoji: '📘' },
            { name: 'Orbe da Eternidade Negra', class: 'mago', emoji: '🔮' }
        ],
        armor: [
            { name: 'Armadura de Noctra', class: null, emoji: '🥋', forcedSlot: 'armor' },
            { name: 'Escudo do Vazio', class: null, emoji: '🛡️', forcedSlot: 'shield' },
            { name: 'Botas da Eternidade', class: null, emoji: '👢', forcedSlot: 'boots' }
        ],
        jewelry: [
            { name: 'Anel Mítico', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto de Noctra', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    }
};

const BASE_RARITIES = [
    { name: 'Comum', multiplier: 1.00, weight: 52 },
    { name: 'Incomum', multiplier: 1.15, weight: 26 },
    { name: 'Raro', multiplier: 1.32, weight: 13 },
    { name: 'Épico', multiplier: 1.58, weight: 6 },
    { name: 'Lendário', multiplier: 1.90, weight: 2 },
    { name: 'Mítico', multiplier: 2.30, weight: 1 }
];

const CATEGORY_WEIGHTS = {
    weapon: 45,
    armor: 35,
    jewelry: 20
};

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function weightedChoice(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;

    for (const entry of entries) {
        roll -= entry.weight;
        if (roll <= 0) return entry;
    }

    return entries[0];
}

function weightedCategory() {
    return weightedChoice(
        Object.entries(CATEGORY_WEIGHTS).map(([name, weight]) => ({ name, weight }))
    ).name;
}

function getTierByMap(mapId = 1) {
    if (mapId <= 1) return 'level1';
    if (mapId === 2) return 'level6';
    if (mapId === 3) return 'level12';
    if (mapId === 4) return 'level18';
    if (mapId === 5) return 'level26';
    return 'level36';
}

function getLevelFromTier(tier) {
    const levelMap = {
        level1: 1,
        level6: 6,
        level12: 12,
        level18: 18,
        level26: 26,
        level36: 36
    };
    return levelMap[tier] || 1;
}

function getSlotFromItem(category, itemData) {
    if (itemData.forcedSlot) return itemData.forcedSlot;

    if (category === 'weapon') return 'weapon';

    if (category === 'armor') {
        const lowerName = itemData.name.toLowerCase();
        if (lowerName.includes('escudo')) return 'shield';
        if (lowerName.includes('bota')) return 'boots';
        return 'armor';
    }

    if (category === 'jewelry') {
        const lowerName = itemData.name.toLowerCase();
        if (lowerName.includes('anel')) return 'ring';
        if (lowerName.includes('amuleto')) return 'necklace';
        return Math.random() < 0.5 ? 'ring' : 'necklace';
    }

    return 'weapon';
}

function getPowerTier(power) {
    if (power < 18) return 'Fraco';
    if (power < 35) return 'Bom';
    if (power < 60) return 'Forte';
    if (power < 90) return 'Elite';
    if (power < 130) return 'Lendário';
    return 'Mítico';
}

function buildStatsBySlot(tier, slot) {
    const scaleMap = {
        level1: 1.00,
        level6: 1.45,
        level12: 1.95,
        level18: 2.55,
        level26: 3.35,
        level36: 4.35
    };

    const scale = scaleMap[tier] || 1;

    if (slot === 'weapon') {
        return {
            atk: rand(4, 7) * scale,
            def: rand(0, 2) * scale * 0.35,
            hp: rand(0, 6) * scale * 0.45,
            crit: rand(2, 5) * scale * 0.50
        };
    }

    if (slot === 'shield') {
        return {
            atk: 0,
            def: rand(5, 8) * scale,
            hp: rand(8, 15) * scale,
            crit: 0
        };
    }

    if (slot === 'armor') {
        return {
            atk: 0,
            def: rand(4, 7) * scale,
            hp: rand(6, 12) * scale,
            crit: rand(0, 1) * scale * 0.20
        };
    }

    if (slot === 'boots') {
        return {
            atk: 0,
            def: rand(2, 4) * scale,
            hp: rand(4, 8) * scale,
            crit: rand(2, 4) * scale * 0.40
        };
    }

    if (slot === 'ring' || slot === 'necklace') {
        return {
            atk: rand(1, 3) * scale,
            def: rand(1, 2) * scale * 0.45,
            hp: rand(4, 8) * scale,
            crit: rand(3, 6) * scale * 0.55
        };
    }

    return {
        atk: 1,
        def: 1,
        hp: 1,
        crit: 1
    };
}

function roundStats(stats) {
    return {
        atk: Math.max(0, Math.round(stats.atk || 0)),
        def: Math.max(0, Math.round(stats.def || 0)),
        hp: Math.max(0, Math.round(stats.hp || 0)),
        crit: Math.max(0, Math.round(stats.crit || 0))
    };
}

function buildItemId() {
    return `${Date.now()}_${rand(1000, 9999)}`;
}

/*
=================================
PERFIS DE DROP
=================================
*/

function getDropProfileByEnemy(mapId = 1, encounterTier = 'common') {
    const baseByMap = {
        1: {
            common: { chance: 0.08, rarityBias: 'early_common' },
            elite: { chance: 0.18, rarityBias: 'early_elite' },
            miniboss: { chance: 0.32, rarityBias: 'early_boss' },
            boss: { chance: 0.55, rarityBias: 'early_boss' }
        },
        2: {
            common: { chance: 0.10, rarityBias: 'mid_common' },
            elite: { chance: 0.20, rarityBias: 'mid_elite' },
            miniboss: { chance: 0.35, rarityBias: 'mid_boss' },
            boss: { chance: 0.60, rarityBias: 'mid_boss' }
        },
        3: {
            common: { chance: 0.11, rarityBias: 'mid_common' },
            elite: { chance: 0.22, rarityBias: 'mid_elite' },
            miniboss: { chance: 0.38, rarityBias: 'mid_boss' },
            boss: { chance: 0.65, rarityBias: 'mid_boss' }
        },
        4: {
            common: { chance: 0.12, rarityBias: 'late_common' },
            elite: { chance: 0.24, rarityBias: 'late_elite' },
            miniboss: { chance: 0.42, rarityBias: 'late_boss' },
            boss: { chance: 0.70, rarityBias: 'late_boss' }
        },
        5: {
            common: { chance: 0.13, rarityBias: 'late_common' },
            elite: { chance: 0.26, rarityBias: 'late_elite' },
            miniboss: { chance: 0.45, rarityBias: 'late_boss' },
            boss: { chance: 0.74, rarityBias: 'late_boss' }
        },
        6: {
            common: { chance: 0.14, rarityBias: 'endgame_common' },
            elite: { chance: 0.28, rarityBias: 'endgame_elite' },
            miniboss: { chance: 0.48, rarityBias: 'endgame_boss' },
            boss: { chance: 0.78, rarityBias: 'endgame_boss' }
        }
    };

    const profileMap = baseByMap[mapId] || baseByMap[1];
    return profileMap[encounterTier] || profileMap.common;
}

function getRarityTableByBias(rarityBias = 'early_common') {
    const tables = {
        early_common: [
            { name: 'Comum', multiplier: 1.00, weight: 64 },
            { name: 'Incomum', multiplier: 1.15, weight: 24 },
            { name: 'Raro', multiplier: 1.32, weight: 9 },
            { name: 'Épico', multiplier: 1.58, weight: 2 },
            { name: 'Lendário', multiplier: 1.90, weight: 1 }
        ],
        early_elite: [
            { name: 'Comum', multiplier: 1.00, weight: 42 },
            { name: 'Incomum', multiplier: 1.15, weight: 30 },
            { name: 'Raro', multiplier: 1.32, weight: 18 },
            { name: 'Épico', multiplier: 1.58, weight: 8 },
            { name: 'Lendário', multiplier: 1.90, weight: 2 }
        ],
        early_boss: [
            { name: 'Incomum', multiplier: 1.15, weight: 38 },
            { name: 'Raro', multiplier: 1.32, weight: 30 },
            { name: 'Épico', multiplier: 1.58, weight: 18 },
            { name: 'Lendário', multiplier: 1.90, weight: 10 },
            { name: 'Mítico', multiplier: 2.30, weight: 4 }
        ],
        mid_common: [
            { name: 'Comum', multiplier: 1.00, weight: 42 },
            { name: 'Incomum', multiplier: 1.15, weight: 30 },
            { name: 'Raro', multiplier: 1.32, weight: 18 },
            { name: 'Épico', multiplier: 1.58, weight: 7 },
            { name: 'Lendário', multiplier: 1.90, weight: 3 }
        ],
        mid_elite: [
            { name: 'Incomum', multiplier: 1.15, weight: 34 },
            { name: 'Raro', multiplier: 1.32, weight: 28 },
            { name: 'Épico', multiplier: 1.58, weight: 22 },
            { name: 'Lendário', multiplier: 1.90, weight: 12 },
            { name: 'Mítico', multiplier: 2.30, weight: 4 }
        ],
        mid_boss: [
            { name: 'Raro', multiplier: 1.32, weight: 34 },
            { name: 'Épico', multiplier: 1.58, weight: 28 },
            { name: 'Lendário', multiplier: 1.90, weight: 24 },
            { name: 'Mítico', multiplier: 2.30, weight: 14 }
        ],
        late_common: [
            { name: 'Incomum', multiplier: 1.15, weight: 34 },
            { name: 'Raro', multiplier: 1.32, weight: 30 },
            { name: 'Épico', multiplier: 1.58, weight: 20 },
            { name: 'Lendário', multiplier: 1.90, weight: 12 },
            { name: 'Mítico', multiplier: 2.30, weight: 4 }
        ],
        late_elite: [
            { name: 'Raro', multiplier: 1.32, weight: 32 },
            { name: 'Épico', multiplier: 1.58, weight: 28 },
            { name: 'Lendário', multiplier: 1.90, weight: 24 },
            { name: 'Mítico', multiplier: 2.30, weight: 16 }
        ],
        late_boss: [
            { name: 'Épico', multiplier: 1.58, weight: 36 },
            { name: 'Lendário', multiplier: 1.90, weight: 34 },
            { name: 'Mítico', multiplier: 2.30, weight: 30 }
        ],
        endgame_common: [
            { name: 'Raro', multiplier: 1.32, weight: 30 },
            { name: 'Épico', multiplier: 1.58, weight: 28 },
            { name: 'Lendário', multiplier: 1.90, weight: 24 },
            { name: 'Mítico', multiplier: 2.30, weight: 18 }
        ],
        endgame_elite: [
            { name: 'Épico', multiplier: 1.58, weight: 34 },
            { name: 'Lendário', multiplier: 1.90, weight: 33 },
            { name: 'Mítico', multiplier: 2.30, weight: 33 }
        ],
        endgame_boss: [
            { name: 'Lendário', multiplier: 1.90, weight: 50 },
            { name: 'Mítico', multiplier: 2.30, weight: 50 }
        ]
    };

    return tables[rarityBias] || BASE_RARITIES;
}

function selectRarity(rarityBias) {
    return weightedChoice(getRarityTableByBias(rarityBias));
}

function generateDrop(mapId = 1, options = {}) {
    const tier = getTierByMap(mapId);
    const category = weightedCategory();
    const itemData = randomFrom(ITEM_POOL[tier][category]);
    const rarity = selectRarity(options.rarityBias);
    const slot = getSlotFromItem(category, itemData);

    const base = buildStatsBySlot(tier, slot);
    const finalStats = roundStats({
        atk: base.atk * rarity.multiplier,
        def: base.def * rarity.multiplier,
        hp: base.hp * rarity.multiplier,
        crit: base.crit * rarity.multiplier
    });

    const power =
        finalStats.atk * 2 +
        finalStats.def * 2 +
        Math.floor(finalStats.hp / 2) +
        finalStats.crit * 3;

    return {
        id: buildItemId(),
        name: itemData.name,
        emoji: itemData.emoji || '⚪',
        rarity: rarity.name,
        level: getLevelFromTier(tier),
        atk: finalStats.atk,
        def: finalStats.def,
        hp: finalStats.hp,
        crit: finalStats.crit,
        power,
        powerTier: getPowerTier(power),
        slot,
        category,
        classRestriction: itemData.class || null
    };
}

module.exports = {
    generateDrop,
    getDropProfileByEnemy,
    ITEM_POOL,
    RARITIES: BASE_RARITIES
};