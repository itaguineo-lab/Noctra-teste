const CATEGORY_WEIGHTS = {
    weapon: 40,
    armor: 40,
    jewelry: 20
};

const ENCOUNTER_CATEGORY_WEIGHTS = {
    common: { weapon: 38, armor: 42, jewelry: 20 },
    elite: { weapon: 42, armor: 36, jewelry: 22 },
    miniboss: { weapon: 44, armor: 34, jewelry: 22 },
    boss: { weapon: 46, armor: 32, jewelry: 22 }
};

const CLASS_BIAS_WEIGHTS = {
    classItem: 78,
    universalItem: 18,
    offClassItem: 4
};

const BASE_RARITIES = [
    { name: 'Comum', multiplier: 1.00, weight: 58, quality: 'Comum' },
    { name: 'Incomum', multiplier: 1.14, weight: 24, quality: 'Refinado' },
    { name: 'Raro', multiplier: 1.30, weight: 11, quality: 'Notável' },
    { name: 'Épico', multiplier: 1.54, weight: 5, quality: 'Épico' },
    { name: 'Lendário', multiplier: 1.86, weight: 1.7, quality: 'Lendário' },
    { name: 'Mítico', multiplier: 2.22, weight: 0.3, quality: 'Mítico' }
];

const SLOT_TO_UI_CATEGORY = {
    weapon: 'weapons',
    shield: 'offhands',
    armor: 'armors',
    boots: 'boots',
    ring: 'rings',
    necklace: 'necklaces'
};

const TIER_META = {
    level1: {
        mapNumber: 1,
        level: 1,
        originMapId: 'clareira_sombria',
        originMap: 'Clareira Sombria',
        setName: 'Sombras da Clareira',
        itemFamily: 'clareira',
        suffixes: ['da Clareira', 'do Uivo Baixo', 'da Sombra Úmida'],
        traits: ['Vigilante', 'Feral', 'Silencioso'],
        flavor: 'Marcado pela primeira escuridão de Noctra.'
    },
    level8: {
        mapNumber: 2,
        level: 8,
        originMapId: 'cripta_em_ruinas',
        originMap: 'Cripta em Ruínas',
        setName: 'Relíquias da Cripta',
        itemFamily: 'cripta',
        suffixes: ['da Cripta', 'dos Ossos Frios', 'do Túmulo Velado'],
        traits: ['Profanado', 'Sepulcral', 'Ecoante'],
        flavor: 'Carrega pó de túmulo e murmúrios antigos.'
    },
    level15: {
        mapNumber: 3,
        level: 15,
        originMapId: 'pantano_corrompido',
        originMap: 'Pântano Corrompido',
        setName: 'Lodo Corrompido',
        itemFamily: 'pantano',
        suffixes: ['do Pântano', 'do Lodo Negro', 'da Febre Verde'],
        traits: ['Corrompido', 'Tóxico', 'Putrefato'],
        flavor: 'Impregnado pelo veneno lento do pântano.'
    },
    level24: {
        mapNumber: 4,
        level: 24,
        originMapId: 'deserto_incandescente',
        originMap: 'Deserto Incandescente',
        setName: 'Cinzas Incandescentes',
        itemFamily: 'deserto',
        suffixes: ['das Brasas', 'do Sol Morto', 'da Areia Ardente'],
        traits: ['Incandescente', 'Escaldante', 'Forjado em Cinzas'],
        flavor: 'Ainda quente pelo fogo enterrado sob a areia.'
    },
    level32: {
        mapNumber: 5,
        level: 32,
        originMapId: 'citadela_lunar',
        originMap: 'Citadela Lunar',
        setName: 'Juramento Lunar',
        itemFamily: 'citadela',
        suffixes: ['da Lua Alta', 'da Citadela', 'do Juramento Prateado'],
        traits: ['Lunar', 'Astral', 'Consagrado'],
        flavor: 'Reluz com a luz fria da Citadela Lunar.'
    },
    level42: {
        mapNumber: 6,
        level: 42,
        originMapId: 'abismo_noctra',
        originMap: 'Abismo de Noctra',
        setName: 'Abismo de Noctra',
        itemFamily: 'abismo',
        suffixes: ['do Abismo', 'de Noctra', 'do Trono Vazio'],
        traits: ['Abissal', 'Eterno', 'Sem-Luz'],
        flavor: 'Um fragmento da escuridão final.'
    }
};

function weaponOneHanded(name, emoji, className, requiredOffhandType) {
    return {
        name,
        emoji,
        allowedClasses: [className],
        weaponStyle: 'one_handed',
        offhandMode: 'optional',
        requiredOffhandType
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

function buildTierPool(theme) {
    return {
        weapon: [
            weaponOneHanded(`Espada ${theme.traits[0]}`, '🗡️', 'guerreiro', 'shield'),
            weaponTwoHanded(`Machado ${theme.traits[1]}`, '🪓', 'guerreiro'),
            weaponOneHanded(`Arco ${theme.traits[2]}`, '🏹', 'arqueiro', 'quiver'),
            weaponOneHanded(`Lança ${theme.traits[0]}`, '🔱', 'arqueiro', 'shield'),
            weaponOneHanded(`Varinha ${theme.traits[1]}`, '🪄', 'mago', 'orb'),
            weaponTwoHanded(`Cajado ${theme.traits[2]}`, '🪄', 'mago')
        ],
        armor: [
            armorItem(`Couraça ${theme.traits[0]}`, '🛡️', 'guerreiro'),
            offhandItem(`Escudo ${theme.traits[1]}`, '🛡️', ['guerreiro', 'arqueiro'], 'shield'),
            bootsItem(`Botas de Guerra ${theme.traits[2]}`, '👢', 'guerreiro'),

            armorItem(`Traje ${theme.traits[2]}`, '🥋', 'arqueiro'),
            offhandItem(`Aljava ${theme.traits[0]}`, '🏹', ['arqueiro'], 'quiver'),
            bootsItem(`Botas de Caça ${theme.traits[1]}`, '👢', 'arqueiro'),

            armorItem(`Manto ${theme.traits[1]}`, '🧥', 'mago'),
            offhandItem(`Orbe ${theme.traits[2]}`, '🔮', ['mago'], 'orb'),
            bootsItem(`Sandálias ${theme.traits[0]}`, '👢', 'mago')
        ],
        jewelry: [
            jewelItem(`Anel ${theme.traits[0]}`, '💍', 'ring'),
            jewelItem(`Amuleto ${theme.traits[1]}`, '📿', 'necklace'),
            jewelItem(`Selo ${theme.traits[2]}`, '💍', 'ring'),
            jewelItem(`Talismã ${theme.traits[0]}`, '📿', 'necklace')
        ]
    };
}

const ITEM_POOL = Object.fromEntries(
    Object.entries(TIER_META).map(([tier, meta]) => [tier, buildTierPool(meta)])
);

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeClassName(value = '') {
    return String(value || '').trim().toLowerCase();
}

function weightedChoice(entries) {
    const safeEntries = entries.filter(entry => entry && entry.weight > 0);
    const total = safeEntries.reduce((sum, entry) => sum + entry.weight, 0);

    if (total <= 0) return safeEntries[0] || entries[0];

    let roll = Math.random() * total;

    for (const entry of safeEntries) {
        roll -= entry.weight;
        if (roll <= 0) return entry;
    }

    return safeEntries[0] || entries[0];
}

function weightedCategory(encounterTier = 'common') {
    const weights = ENCOUNTER_CATEGORY_WEIGHTS[encounterTier] || CATEGORY_WEIGHTS;
    return weightedChoice(
        Object.entries(weights).map(([name, weight]) => ({ name, weight }))
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
    return TIER_META[tier]?.level || 1;
}

function itemAllowsClass(itemData, playerClass) {
    const normalizedClass = normalizeClassName(playerClass);
    if (!normalizedClass) return false;

    const allowedClasses = Array.isArray(itemData.allowedClasses)
        ? itemData.allowedClasses.map(normalizeClassName)
        : [];

    return allowedClasses.includes(normalizedClass);
}

function isUniversalItem(itemData) {
    return !Array.isArray(itemData.allowedClasses) || itemData.allowedClasses.length === 0;
}

function splitItemsByClassBias(items, playerClass) {
    const normalizedClass = normalizeClassName(playerClass);

    if (!normalizedClass) {
        return {
            classItems: [],
            universalItems: [],
            offClassItems: items
        };
    }

    return {
        classItems: items.filter(item => itemAllowsClass(item, normalizedClass)),
        universalItems: items.filter(item => isUniversalItem(item)),
        offClassItems: items.filter(item => !itemAllowsClass(item, normalizedClass) && !isUniversalItem(item))
    };
}

function randomItemWithClassBias(items, playerClass) {
    if (!Array.isArray(items) || !items.length) return null;

    const normalizedClass = normalizeClassName(playerClass);

    if (!normalizedClass) {
        return randomFrom(items);
    }

    const {
        classItems,
        universalItems,
        offClassItems
    } = splitItemsByClassBias(items, normalizedClass);

    const buckets = [];

    if (classItems.length) {
        buckets.push({ name: 'classItem', weight: CLASS_BIAS_WEIGHTS.classItem, items: classItems });
    }

    if (universalItems.length) {
        buckets.push({ name: 'universalItem', weight: CLASS_BIAS_WEIGHTS.universalItem, items: universalItems });
    }

    if (offClassItems.length) {
        buckets.push({ name: 'offClassItem', weight: CLASS_BIAS_WEIGHTS.offClassItem, items: offClassItems });
    }

    if (!buckets.length) return randomFrom(items);

    const selectedBucket = weightedChoice(buckets);
    return randomFrom(selectedBucket.items);
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
        if (lowerName.includes('anel') || lowerName.includes('selo')) return 'ring';
        if (lowerName.includes('amuleto') || lowerName.includes('talismã') || lowerName.includes('talisma')) return 'necklace';
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
        ring: 'Anel',
        necklace: 'Colar'
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

function getTraitTable(slot) {
    const generic = [
        { id: 'balanced', label: 'Equilibrado', atk: 1.00, def: 1.00, hp: 1.00, crit: 1.00, weight: 34 },
        { id: 'brutal', label: 'Brutal', atk: 1.16, def: 0.92, hp: 0.95, crit: 1.06, weight: 18 },
        { id: 'guardian', label: 'Guardião', atk: 0.92, def: 1.18, hp: 1.10, crit: 0.92, weight: 18 },
        { id: 'vital', label: 'Vital', atk: 0.95, def: 1.02, hp: 1.24, crit: 0.90, weight: 16 },
        { id: 'precise', label: 'Preciso', atk: 1.02, def: 0.92, hp: 0.92, crit: 1.28, weight: 14 }
    ];

    if (slot === 'weapon') {
        return [
            { id: 'balanced', label: 'Equilibrado', atk: 1.00, def: 1.00, hp: 1.00, crit: 1.00, weight: 26 },
            { id: 'brutal', label: 'Brutal', atk: 1.22, def: 0.85, hp: 0.90, crit: 1.04, weight: 28 },
            { id: 'precise', label: 'Preciso', atk: 1.05, def: 0.85, hp: 0.90, crit: 1.38, weight: 24 },
            { id: 'duelist', label: 'Duelista', atk: 1.12, def: 0.94, hp: 0.92, crit: 1.18, weight: 22 }
        ];
    }

    if (slot === 'shield' || slot === 'armor') {
        return [
            { id: 'balanced', label: 'Equilibrado', atk: 1.00, def: 1.00, hp: 1.00, crit: 1.00, weight: 26 },
            { id: 'guardian', label: 'Guardião', atk: 0.88, def: 1.24, hp: 1.14, crit: 0.84, weight: 34 },
            { id: 'vital', label: 'Vital', atk: 0.88, def: 1.08, hp: 1.34, crit: 0.82, weight: 24 },
            { id: 'spiked', label: 'Espinhoso', atk: 1.08, def: 1.14, hp: 1.02, crit: 0.92, weight: 16 }
        ];
    }

    return generic;
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
        return { atk: rand(4, 7) * scale, def: rand(0, 2) * scale * 0.30, hp: rand(0, 6) * scale * 0.40, crit: rand(2, 5) * scale * 0.46 };
    }

    if (slot === 'shield') {
        return { atk: rand(0, 2) * scale * 0.30, def: rand(4, 8) * scale, hp: rand(6, 15) * scale, crit: rand(0, 2) * scale * 0.22 };
    }

    if (slot === 'armor') {
        return { atk: 0, def: rand(4, 7) * scale, hp: rand(6, 12) * scale, crit: rand(0, 1) * scale * 0.18 };
    }

    if (slot === 'boots') {
        return { atk: 0, def: rand(2, 4) * scale, hp: rand(4, 8) * scale, crit: rand(2, 4) * scale * 0.34 };
    }

    if (slot === 'ring' || slot === 'necklace') {
        return { atk: rand(1, 3) * scale, def: rand(1, 2) * scale * 0.40, hp: rand(4, 8) * scale, crit: rand(3, 6) * scale * 0.50 };
    }

    return { atk: 1, def: 1, hp: 1, crit: 1 };
}

function applyTrait(stats, trait) {
    return {
        atk: stats.atk * (trait.atk || 1),
        def: stats.def * (trait.def || 1),
        hp: stats.hp * (trait.hp || 1),
        crit: stats.crit * (trait.crit || 1)
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
        1: { common: { chance: 0.06, rarityBias: 'early_common' }, elite: { chance: 0.13, rarityBias: 'early_elite' }, miniboss: { chance: 0.23, rarityBias: 'early_boss' }, boss: { chance: 0.36, rarityBias: 'early_boss' } },
        2: { common: { chance: 0.065, rarityBias: 'mid_common' }, elite: { chance: 0.145, rarityBias: 'mid_elite' }, miniboss: { chance: 0.25, rarityBias: 'mid_boss' }, boss: { chance: 0.40, rarityBias: 'mid_boss' } },
        3: { common: { chance: 0.07, rarityBias: 'mid_common' }, elite: { chance: 0.16, rarityBias: 'mid_elite' }, miniboss: { chance: 0.28, rarityBias: 'mid_boss' }, boss: { chance: 0.44, rarityBias: 'mid_boss' } },
        4: { common: { chance: 0.08, rarityBias: 'late_common' }, elite: { chance: 0.18, rarityBias: 'late_elite' }, miniboss: { chance: 0.31, rarityBias: 'late_boss' }, boss: { chance: 0.48, rarityBias: 'late_boss' } },
        5: { common: { chance: 0.09, rarityBias: 'late_common' }, elite: { chance: 0.20, rarityBias: 'late_elite' }, miniboss: { chance: 0.34, rarityBias: 'late_boss' }, boss: { chance: 0.52, rarityBias: 'late_boss' } },
        6: { common: { chance: 0.10, rarityBias: 'endgame_common' }, elite: { chance: 0.22, rarityBias: 'endgame_elite' }, miniboss: { chance: 0.37, rarityBias: 'endgame_boss' }, boss: { chance: 0.56, rarityBias: 'endgame_boss' } }
    };

    const profileMap = baseByMap[mapId] || baseByMap[1];
    return profileMap[encounterTier] || profileMap.common;
}

function getRarityTableByBias(rarityBias = 'early_common') {
    const tables = {
        early_common: [
            { name: 'Comum', multiplier: 1.00, weight: 68, quality: 'Comum' },
            { name: 'Incomum', multiplier: 1.14, weight: 22, quality: 'Refinado' },
            { name: 'Raro', multiplier: 1.30, weight: 8, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 1.7, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 0.3, quality: 'Lendário' }
        ],
        early_elite: [
            { name: 'Comum', multiplier: 1.00, weight: 48, quality: 'Comum' },
            { name: 'Incomum', multiplier: 1.14, weight: 28, quality: 'Refinado' },
            { name: 'Raro', multiplier: 1.30, weight: 16, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 6, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 2, quality: 'Lendário' }
        ],
        early_boss: [
            { name: 'Incomum', multiplier: 1.14, weight: 42, quality: 'Refinado' },
            { name: 'Raro', multiplier: 1.30, weight: 30, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 18, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 8, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 2, quality: 'Mítico' }
        ],
        mid_common: [
            { name: 'Comum', multiplier: 1.00, weight: 44, quality: 'Comum' },
            { name: 'Incomum', multiplier: 1.14, weight: 30, quality: 'Refinado' },
            { name: 'Raro', multiplier: 1.30, weight: 18, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 6, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 2, quality: 'Lendário' }
        ],
        mid_elite: [
            { name: 'Incomum', multiplier: 1.14, weight: 36, quality: 'Refinado' },
            { name: 'Raro', multiplier: 1.30, weight: 30, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 20, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 10, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 4, quality: 'Mítico' }
        ],
        mid_boss: [
            { name: 'Raro', multiplier: 1.30, weight: 38, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 30, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 22, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 10, quality: 'Mítico' }
        ],
        late_common: [
            { name: 'Incomum', multiplier: 1.14, weight: 36, quality: 'Refinado' },
            { name: 'Raro', multiplier: 1.30, weight: 30, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 20, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 10, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 4, quality: 'Mítico' }
        ],
        late_elite: [
            { name: 'Raro', multiplier: 1.30, weight: 34, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 30, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 24, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 12, quality: 'Mítico' }
        ],
        late_boss: [
            { name: 'Épico', multiplier: 1.54, weight: 40, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 38, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 22, quality: 'Mítico' }
        ],
        endgame_common: [
            { name: 'Raro', multiplier: 1.30, weight: 34, quality: 'Notável' },
            { name: 'Épico', multiplier: 1.54, weight: 30, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 24, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 12, quality: 'Mítico' }
        ],
        endgame_elite: [
            { name: 'Épico', multiplier: 1.54, weight: 38, quality: 'Épico' },
            { name: 'Lendário', multiplier: 1.86, weight: 36, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 26, quality: 'Mítico' }
        ],
        endgame_boss: [
            { name: 'Lendário', multiplier: 1.86, weight: 64, quality: 'Lendário' },
            { name: 'Mítico', multiplier: 2.22, weight: 36, quality: 'Mítico' }
        ]
    };

    return tables[rarityBias] || BASE_RARITIES;
}

function selectRarity(rarityBias) {
    return weightedChoice(getRarityTableByBias(rarityBias));
}

function buildDropSourceLabel(encounterTier = 'common') {
    if (encounterTier === 'boss') return 'Boss';
    if (encounterTier === 'miniboss') return 'Mini Boss';
    if (encounterTier === 'elite') return 'Elite';
    return 'Caça';
}

function buildItemName(baseName, meta, rarity, trait) {
    const suffix = randomFrom(meta.suffixes);

    if (rarity.name === 'Comum') return baseName;
    if (rarity.name === 'Incomum') return `${baseName} ${suffix}`;
    if (rarity.name === 'Raro') return `${baseName} ${trait.label}`;
    if (rarity.name === 'Épico') return `${trait.label} ${baseName} ${suffix}`;
    if (rarity.name === 'Lendário') return `${baseName} ${suffix} Lendário`;
    return `${trait.label} ${baseName} ${suffix} Mítico`;
}

function buildItemFlavor(meta, rarity, trait, sourceLabel) {
    return `${meta.flavor} Traço: ${trait.label}. Fonte: ${sourceLabel}. Raridade: ${rarity.name}.`;
}

function generateDrop(mapId = 1, options = {}) {
    const tier = getTierByMap(mapId);
    const meta = TIER_META[tier] || TIER_META.level1;
    const encounterTier = options.encounterTier || 'common';
    const category = weightedCategory(encounterTier);
    const pool = ITEM_POOL[tier]?.[category] || ITEM_POOL.level1[category] || ITEM_POOL.level1.weapon;
    const itemData = randomItemWithClassBias(pool, options.playerClass || options.className || options.preferredClass);
    const rarity = selectRarity(options.rarityBias);
    const slot = getSlotFromItem(category, itemData);
    const trait = weightedChoice(getTraitTable(slot));
    const sourceLabel = buildDropSourceLabel(encounterTier);
    const itemId = buildItemId();

    const base = buildStatsBySlot(tier, slot);
    const traitStats = applyTrait(base, trait);
    const finalStats = roundStats({
        atk: traitStats.atk * rarity.multiplier,
        def: traitStats.def * rarity.multiplier,
        hp: traitStats.hp * rarity.multiplier,
        crit: traitStats.crit * rarity.multiplier
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
        name: buildItemName(itemData.name, meta, rarity, trait),
        emoji: itemData.emoji || '⚪',
        icon: itemData.emoji || '⚪',

        slot,
        category,
        uiCategory: getUiCategoryFromSlot(slot),
        displayCategory: getDisplayCategoryLabel(slot),

        rarity: rarity.name,
        level: getLevelFromTier(tier),

        atk: finalStats.atk,
        def: finalStats.def,
        hp: finalStats.hp,
        crit: finalStats.crit,
        power,
        powerTier: getPowerTier(power),
        sourceTier: tier,

        setName: meta.setName,
        originMap: meta.originMap,
        originMapId: meta.originMapId,
        originTier: tier,
        encounterTier,
        dropSource: sourceLabel,
        flavor: buildItemFlavor(meta, rarity, trait, sourceLabel),
        trait: trait.id,
        traitLabel: trait.label,
        itemFamily: meta.itemFamily,
        qualityLabel: rarity.quality,
        tags: [meta.itemFamily, trait.id, rarity.name.toLowerCase(), encounterTier],

        classRestriction: allowedClasses.length === 1 ? allowedClasses[0] : null,
        allowedClasses,

        weaponStyle: itemData.weaponStyle || null,
        offhandMode: itemData.offhandMode || null,
        requiredOffhandType: itemData.requiredOffhandType || null,
        offhandType: itemData.offhandType || null,

        price: Math.max(1, Math.floor(power * (rarity.multiplier + 0.55))),
        __equipped: false
    };
}

module.exports = {
    ITEM_POOL,
    TIER_META,
    CATEGORY_WEIGHTS,
    CLASS_BIAS_WEIGHTS,
    BASE_RARITIES,
    generateDrop,
    getDropProfileByEnemy,
    getTierByMap,
    getLevelFromTier,
    getUiCategoryFromSlot,
    getDisplayCategoryLabel
};
