const CATEGORY_WEIGHTS = {
    weapon: 42,
    armor: 38,
    jewelry: 20
};

const BASE_RARITIES = [
    { name: 'Comum', multiplier: 1.00, weight: 58 },
    { name: 'Incomum', multiplier: 1.14, weight: 24 },
    { name: 'Raro', multiplier: 1.30, weight: 11 },
    { name: 'Épico', multiplier: 1.54, weight: 5 },
    { name: 'Lendário', multiplier: 1.86, weight: 1.7 },
    { name: 'Mítico', multiplier: 2.22, weight: 0.3 }
];

const SLOT_TO_UI_CATEGORY = {
    weapon: 'weapons',
    shield: 'armors',
    armor: 'armors',
    boots: 'armors',
    ring: 'jewels',
    necklace: 'jewels'
};

function weaponOneHanded(name, emoji, className, preferredOffhandType) {
    return {
        name,
        emoji,
        allowedClasses: [className],
        weaponStyle: 'one_handed',
        offhandMode: 'optional',
        preferredOffhandType
    };
}

function weaponTwoHanded(name, emoji, className) {
    return {
        name,
        emoji,
        allowedClasses: [className],
        weaponStyle: 'two_handed'
    };
}

function offhandItem(name, emoji, allowedClasses, offhandType) {
    return {
        name,
        emoji,
        forcedSlot: 'shield',
        allowedClasses,
        offhandType
    };
}

function armorItem(name, emoji, className) {
    return {
        name,
        emoji,
        forcedSlot: 'armor',
        allowedClasses: [className]
    };
}

function bootsItem(name, emoji, className) {
    return {
        name,
        emoji,
        forcedSlot: 'boots',
        allowedClasses: [className]
    };
}

function jewelItem(name, emoji, forcedSlot) {
    return {
        name,
        emoji,
        forcedSlot,
        allowedClasses: []
    };
}

const ITEM_POOL = {
    level1: {
        weapon: [
            weaponOneHanded('Espada do Vigia', '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded('Machado Brutal', '🪓', 'guerreiro'),
            weaponOneHanded('Arco do Caçador', '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded('Lança do Batedor', '🔱', 'arqueiro', 'shield'),
            weaponOneHanded('Varinha Arcana', '🪄', 'mago', 'orb'),
            weaponTwoHanded('Cajado do Aprendiz', '🪄', 'mago')
        ],
        armor: [
            armorItem('Armadura do Soldado', '🥋', 'guerreiro'),
            offhandItem('Escudo de Ferro', '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem('Botas do Soldado', '👢', 'guerreiro'),

            armorItem('Gibão do Caçador', '🥋', 'arqueiro'),
            offhandItem('Aljava de Couro', '🏹', ['arqueiro'], 'quiver'),
            bootsItem('Botas do Batedor', '👢', 'arqueiro'),

            armorItem('Manto Arcano', '🥋', 'mago'),
            offhandItem('Orbe Azul', '🔮', ['mago'], 'orb'),
            bootsItem('Sandálias Arcanas', '👢', 'mago')
        ],
        jewelry: [
            jewelItem('Anel Comum', '💍', 'ring'),
            jewelItem('Amuleto Comum', '📿', 'necklace')
        ]
    },

    level8: {
        weapon: [
            weaponOneHanded('Espada da Névoa', '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded('Machado do Eco', '🪓', 'guerreiro'),
            weaponOneHanded('Arco das Folhas Mortas', '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded('Lança da Penumbra', '🔱', 'arqueiro', 'shield'),
            weaponOneHanded('Varinha do Véu', '🪄', 'mago', 'orb'),
            weaponTwoHanded('Cajado dos Murmúrios', '🪄', 'mago')
        ],
        armor: [
            armorItem('Couraça da Névoa', '🥋', 'guerreiro'),
            offhandItem('Escudo Sombrio', '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem('Botas da Névoa', '👢', 'guerreiro'),

            armorItem('Traje da Folha Morta', '🥋', 'arqueiro'),
            offhandItem('Aljava Sombria', '🏹', ['arqueiro'], 'quiver'),
            bootsItem('Botas da Sombra', '👢', 'arqueiro'),

            armorItem('Manto do Véu', '🥋', 'mago'),
            offhandItem('Orbe do Véu', '🔮', ['mago'], 'orb'),
            bootsItem('Sandálias do Véu', '👢', 'mago')
        ],
        jewelry: [
            jewelItem('Anel da Névoa', '💍', 'ring'),
            jewelItem('Amuleto Espectral', '📿', 'necklace')
        ]
    },

    level15: {
        weapon: [
            weaponOneHanded('Espada Tumular', '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded('Machado Carniceiro', '🪓', 'guerreiro'),
            weaponOneHanded('Arco dos Ossos', '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded('Lança Élfica Sombria', '🔱', 'arqueiro', 'shield'),
            weaponOneHanded('Varinha Tumular', '🪄', 'mago', 'orb'),
            weaponTwoHanded('Cajado Tumular', '🪄', 'mago')
        ],
        armor: [
            armorItem('Armadura do Cavaleiro Negro', '🥋', 'guerreiro'),
            offhandItem('Escudo do Corvo', '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem('Botas do Cavaleiro Negro', '👢', 'guerreiro'),

            armorItem('Traje do Ossário', '🥋', 'arqueiro'),
            offhandItem('Aljava dos Ossos', '🏹', ['arqueiro'], 'quiver'),
            bootsItem('Botas Profanas', '👢', 'arqueiro'),

            armorItem('Manto das Almas', '🥋', 'mago'),
            offhandItem('Orbe do Vazio', '🔮', ['mago'], 'orb'),
            bootsItem('Sandálias Profanadas', '👢', 'mago')
        ],
        jewelry: [
            jewelItem('Anel Profanado', '💍', 'ring'),
            jewelItem('Amuleto Funesto', '📿', 'necklace')
        ]
    },

    level24: {
        weapon: [
            weaponOneHanded('Espada do Eclipse', '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded('Machado do Caos', '🪓', 'guerreiro'),
            weaponOneHanded('Arco Lunar', '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded('Lança da Maré Sombria', '🔱', 'arqueiro', 'shield'),
            weaponOneHanded('Varinha do Eclipse', '🪄', 'mago', 'orb'),
            weaponTwoHanded('Cajado de Noctra', '🪄', 'mago')
        ],
        armor: [
            armorItem('Armadura do Eclipse', '🥋', 'guerreiro'),
            offhandItem('Escudo do Abismo', '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem('Botas do Eclipse', '👢', 'guerreiro'),

            armorItem('Traje Lunar', '🥋', 'arqueiro'),
            offhandItem('Aljava Lunar', '🏹', ['arqueiro'], 'quiver'),
            bootsItem('Botas da Lua Negra', '👢', 'arqueiro'),

            armorItem('Manto do Eclipse', '🥋', 'mago'),
            offhandItem('Orbe da Eternidade', '🔮', ['mago'], 'orb'),
            bootsItem('Sandálias do Eclipse', '👢', 'mago')
        ],
        jewelry: [
            jewelItem('Anel Solar Negro', '💍', 'ring'),
            jewelItem('Amuleto da Tempestade', '📿', 'necklace')
        ]
    },

    level32: {
        weapon: [
            weaponOneHanded('Espada da Citadela', '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded('Machado do Cometa', '🪓', 'guerreiro'),
            weaponOneHanded('Arco da Lua Partida', '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded('Lança do Guardião Lunar', '🔱', 'arqueiro', 'shield'),
            weaponOneHanded('Varinha Astral', '🪄', 'mago', 'orb'),
            weaponTwoHanded('Cajado Astral', '🪄', 'mago')
        ],
        armor: [
            armorItem('Armadura Celestial', '🥋', 'guerreiro'),
            offhandItem('Escudo Lunar', '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem('Botas Astrais de Guerra', '👢', 'guerreiro'),

            armorItem('Traje da Lua Alta', '🥋', 'arqueiro'),
            offhandItem('Aljava da Lua Alta', '🏹', ['arqueiro'], 'quiver'),
            bootsItem('Botas Astrais do Caçador', '👢', 'arqueiro'),

            armorItem('Manto Celeste', '🥋', 'mago'),
            offhandItem('Orbe da Maré Lunar', '🔮', ['mago'], 'orb'),
            bootsItem('Sandálias Celestes', '👢', 'mago')
        ],
        jewelry: [
            jewelItem('Anel da Lua Alta', '💍', 'ring'),
            jewelItem('Amuleto Estelar', '📿', 'necklace')
        ]
    },

    level42: {
        weapon: [
            weaponOneHanded('Espada de Noctra', '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded('Machado do Fim', '🪓', 'guerreiro'),
            weaponOneHanded('Arco do Abismo', '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded('Lança da Ruína', '🔱', 'arqueiro', 'shield'),
            weaponOneHanded('Varinha do Trono Vazio', '🪄', 'mago', 'orb'),
            weaponTwoHanded('Cajado do Trono Vazio', '🪄', 'mago')
        ],
        armor: [
            armorItem('Armadura de Noctra', '🥋', 'guerreiro'),
            offhandItem('Escudo do Vazio', '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem('Botas da Eternidade de Guerra', '👢', 'guerreiro'),

            armorItem('Traje do Abismo', '🥋', 'arqueiro'),
            offhandItem('Aljava do Abismo', '🏹', ['arqueiro'], 'quiver'),
            bootsItem('Botas da Eternidade do Caçador', '👢', 'arqueiro'),

            armorItem('Manto de Noctra', '🥋', 'mago'),
            offhandItem('Orbe da Eternidade Negra', '🔮', ['mago'], 'orb'),
            bootsItem('Sandálias da Eternidade Arcana', '👢', 'mago')
        ],
        jewelry: [
            jewelItem('Anel Mítico', '💍', 'ring'),
            jewelItem('Amuleto de Noctra', '📿', 'necklace')
        ]
    }
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
        if (lowerName.includes('escudo') || lowerName.includes('aljava') || lowerName.includes('orbe')) return 'shield';
        if (lowerName.includes('bota') || lowerName.includes('sandália') || lowerName.includes('sandalia')) return 'boots';
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
        shield: 'Mão Secundária',
        armor: 'Armadura',
        boots: 'Botas',
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
            atk: rand(0, 2) * scale * 0.30,
            def: rand(4, 8) * scale,
            hp: rand(6, 15) * scale,
            crit: rand(0, 2) * scale * 0.22
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

    const allowedClasses = Array.isArray(itemData.allowedClasses)
        ? itemData.allowedClasses.map(value => String(value).toLowerCase())
        : [];

    return {
        id: itemId,
        instanceId: itemId,
        legacyBase: itemId,
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
        allowedClasses,
        classRestriction: allowedClasses.length === 1 ? allowedClasses[0] : null,
        weaponStyle: itemData.weaponStyle || null,
        offhandMode: itemData.offhandMode || null,
        preferredOffhandType: itemData.preferredOffhandType || null,
        offhandType: itemData.offhandType || null,
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