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

    level8: {
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

    level15: {
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
            { name: 'Anel Profanado', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto Funesto', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level24: {
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
            { name: 'Anel Solar Negro', class: null, emoji: '💍', forcedSlot: 'ring' },
            { name: 'Amuleto da Tempestade', class: null, emoji: '📿', forcedSlot: 'necklace' }
        ]
    },

    level32: {
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

    level42: {
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
    { name: 'Comum', multiplier: 1.00, weight: 58 },
    { name: 'Incomum', multiplier: 1.14, weight: 24 },
    { name: 'Raro', multiplier: 1.30, weight: 11 },
    { name: 'Épico', multiplier: 1.54, weight: 5 },
    { name: 'Lendário', multiplier: 1.86, weight: 1.7 },
    { name: 'Mítico', multiplier: 2.22, weight: 0.3 }
];

const CATEGORY_WEIGHTS = {
    weapon: 42,
    armor: 38,
    jewelry: 20
};

const SLOT_TO_UI_CATEGORY = {
    weapon: 'weapons',
    shield: 'armors',
    armor: 'armors',
    boots: 'armors',
    ring: 'jewels',
    necklace: 'jewels'
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
    if (mapId === 2) return 'level8';
    if (mapId === 3) return 'level15';
    if (mapId === 4) return 'level24';
    if (mapId === 5) return 'level32';
    return 'level42';
}

function getLevelFromTier(tier) {
    const levelMap = {
        level1: 1,
        level8: 8,
        level15: 15,
        level24: 24,
        level32: 32,
        level42: 42
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

function getUiCategoryFromSlot(slot) {
    return SLOT_TO_UI_CATEGORY[slot] || 'weapons';
}

function getDisplayCategoryLabel(slot) {
    const labels = {
        weapon: 'Arma',
        shield: 'Armadura',
        armor: 'Armadura',
        boots: 'Armadura',
        ring: 'Joia',
        necklace: 'Joia'
    };

    return labels[slot] || 'Item';
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
        level8: 1.52,
        level15: 2.18,
        level24: 3.05,
        level32: 3.95,
        level42: 5.05
    };

    const scale = scaleMap[tier] || 1;

    if (slot === 'weapon') {
        return {
            atk: rand(4, 7) * scale,
            def: rand(0, 2) * scale * 0.30,
            hp: rand(0, 6) * scale * 0.40,
            crit: rand(2, 5) * scale * 0.46
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
            crit: rand(0, 1) * scale * 0.18
        };
    }

    if (slot === 'boots') {
        return {
            atk: 0,
            def: rand(2, 4) * scale,
            hp: rand(4, 8) * scale,
            crit: rand(2, 4) * scale * 0.34
        };
    }

    if (slot === 'ring' || slot === 'necklace') {
        return {
            atk: rand(1, 3) * scale,
            def: rand(1, 2) * scale * 0.40,
            hp: rand(4, 8) * scale,
            crit: rand(3, 6) * scale * 0.50
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
    return `drop_${Date.now()}_${rand(1000, 9999)}`;
}

function getDropProfileByEnemy(mapId = 1, encounterTier = 'common') {
    const baseByMap = {
        1: {
            common: { chance: 0.05, rarityBias: 'early_common' },
            elite: { chance: 0.12, rarityBias: 'early_elite' },
            miniboss: { chance: 0.22, rarityBias: 'early_boss' },
            boss: { chance: 0.36, rarityBias: 'early_boss' }
        },
        2: {
            common: { chance: 0.06, rarityBias: 'mid_common' },
            elite: { chance: 0.14, rarityBias: 'mid_elite' },
            miniboss: { chance: 0.24, rarityBias: 'mid_boss' },
            boss: { chance: 0.40, rarityBias: 'mid_boss' }
        },
        3: {
            common: { chance: 0.07, rarityBias: 'mid_common' },
            elite: { chance: 0.15, rarityBias: 'mid_elite' },
            miniboss: { chance: 0.27, rarityBias: 'mid_boss' },
            boss: { chance: 0.44, rarityBias: 'mid_boss' }
        },
        4: {
            common: { chance: 0.08, rarityBias: 'late_common' },
            elite: { chance: 0.17, rarityBias: 'late_elite' },
            miniboss: { chance: 0.30, rarityBias: 'late_boss' },
            boss: { chance: 0.48, rarityBias: 'late_boss' }
        },
        5: {
            common: { chance: 0.09, rarityBias: 'late_common' },
            elite: { chance: 0.19, rarityBias: 'late_elite' },
            miniboss: { chance: 0.33, rarityBias: 'late_boss' },
            boss: { chance: 0.52, rarityBias: 'late_boss' }
        },
        6: {
            common: { chance: 0.10, rarityBias: 'endgame_common' },
            elite: { chance: 0.21, rarityBias: 'endgame_elite' },
            miniboss: { chance: 0.36, rarityBias: 'endgame_boss' },
            boss: { chance: 0.56, rarityBias: 'endgame_boss' }
        }
    };

    const profileMap = baseByMap[mapId] || baseByMap[1];
    return profileMap[encounterTier] || profileMap.common;
}

function getRarityTableByBias(rarityBias = 'early_common') {
    const tables = {
        early_common: [
            { name: 'Comum', multiplier: 1.00, weight: 68 },
            { name: 'Incomum', multiplier: 1.14, weight: 22 },
            { name: 'Raro', multiplier: 1.30, weight: 8 },
            { name: 'Épico', multiplier: 1.54, weight: 1.7 },
            { name: 'Lendário', multiplier: 1.86, weight: 0.3 }
        ],
        early_elite: [
            { name: 'Comum', multiplier: 1.00, weight: 48 },
            { name: 'Incomum', multiplier: 1.14, weight: 28 },
            { name: 'Raro', multiplier: 1.30, weight: 16 },
            { name: 'Épico', multiplier: 1.54, weight: 6 },
            { name: 'Lendário', multiplier: 1.86, weight: 2 }
        ],
        early_boss: [
            { name: 'Incomum', multiplier: 1.14, weight: 42 },
            { name: 'Raro', multiplier: 1.30, weight: 30 },
            { name: 'Épico', multiplier: 1.54, weight: 18 },
            { name: 'Lendário', multiplier: 1.86, weight: 8 },
            { name: 'Mítico', multiplier: 2.22, weight: 2 }
        ],
        mid_common: [
            { name: 'Comum', multiplier: 1.00, weight: 44 },
            { name: 'Incomum', multiplier: 1.14, weight: 30 },
            { name: 'Raro', multiplier: 1.30, weight: 18 },
            { name: 'Épico', multiplier: 1.54, weight: 6 },
            { name: 'Lendário', multiplier: 1.86, weight: 2 }
        ],
        mid_elite: [
            { name: 'Incomum', multiplier: 1.14, weight: 36 },
            { name: 'Raro', multiplier: 1.30, weight: 30 },
            { name: 'Épico', multiplier: 1.54, weight: 20 },
            { name: 'Lendário', multiplier: 1.86, weight: 10 },
            { name: 'Mítico', multiplier: 2.22, weight: 4 }
        ],
        mid_boss: [
            { name: 'Raro', multiplier: 1.30, weight: 38 },
            { name: 'Épico', multiplier: 1.54, weight: 30 },
            { name: 'Lendário', multiplier: 1.86, weight: 22 },
            { name: 'Mítico', multiplier: 2.22, weight: 10 }
        ],
        late_common: [
            { name: 'Incomum', multiplier: 1.14, weight: 36 },
            { name: 'Raro', multiplier: 1.30, weight: 30 },
            { name: 'Épico', multiplier: 1.54, weight: 20 },
            { name: 'Lendário', multiplier: 1.86, weight: 10 },
            { name: 'Mítico', multiplier: 2.22, weight: 4 }
        ],
        late_elite: [
            { name: 'Raro', multiplier: 1.30, weight: 34 },
            { name: 'Épico', multiplier: 1.54, weight: 30 },
            { name: 'Lendário', multiplier: 1.86, weight: 24 },
            { name: 'Mítico', multiplier: 2.22, weight: 12 }
        ],
        late_boss: [
            { name: 'Épico', multiplier: 1.54, weight: 40 },
            { name: 'Lendário', multiplier: 1.86, weight: 38 },
            { name: 'Mítico', multiplier: 2.22, weight: 22 }
        ],
        endgame_common: [
            { name: 'Raro', multiplier: 1.30, weight: 34 },
            { name: 'Épico', multiplier: 1.54, weight: 30 },
            { name: 'Lendário', multiplier: 1.86, weight: 24 },
            { name: 'Mítico', multiplier: 2.22, weight: 12 }
        ],
        endgame_elite: [
            { name: 'Épico', multiplier: 1.54, weight: 38 },
            { name: 'Lendário', multiplier: 1.86, weight: 36 },
            { name: 'Mítico', multiplier: 2.22, weight: 26 }
        ],
        endgame_boss: [
            { name: 'Lendário', multiplier: 1.86, weight: 64 },
            { name: 'Mítico', multiplier: 2.22, weight: 36 }
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
    const itemId = buildItemId();

    const base = buildStatsBySlot(tier, slot);
    const finalStats = roundStats({
        atk: base.atk * rarity.multiplier,
        def: base.def * rarity.multiplier,
        hp: base.hp * rarity.multiplier,
        crit: base.crit * rarity.multiplier
    });

    const power = Math.max(
        1,
        finalStats.atk * 2 +
        finalStats.def * 2 +
        Math.floor(finalStats.hp / 2) +
        finalStats.crit * 3
    );

    return {
        id: itemId,
        instanceId: itemId,
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
        uiCategory: getUiCategoryFromSlot(slot),
        displayCategory: getDisplayCategoryLabel(slot),
        classRestriction: itemData.class || null,
        sourceTier: options.encounterTier || 'common'
    };
}

module.exports = {
    generateDrop,
    getDropProfileByEnemy,
    getUiCategoryFromSlot,
    getDisplayCategoryLabel,
    ITEM_POOL,
    RARITIES: BASE_RARITIES
};