const { generateDrop } = require('../../data/itemsV2');

const RARITY_EPIC = '\u00c9pico';
const RARITY_LEGENDARY = 'Lend\u00e1rio';
const RARITY_MYTHIC = 'M\u00edtico';

const FIELD_FORBIDDEN_RARITIES_BY_TIER = {
    common: new Set([RARITY_LEGENDARY, RARITY_MYTHIC]),
    elite: new Set([RARITY_LEGENDARY, RARITY_MYTHIC]),
    miniboss: new Set([RARITY_LEGENDARY, RARITY_MYTHIC]),
    boss: new Set([RARITY_MYTHIC])
};

const FIELD_DROP_MAX_RARITY_BY_TIER = {
    common: RARITY_EPIC,
    elite: RARITY_EPIC,
    miniboss: RARITY_EPIC,
    boss: RARITY_LEGENDARY
};

function canDropMythic(options = {}) {
    return Boolean(
        options.allowMythicDrop ||
        options.isEliteDungeon ||
        options.isWorldBoss ||
        options.isEventBoss
    );
}

function isDungeonOrExternalDrop(options = {}) {
    return canDropMythic(options);
}

function getPolicyTier(encounterTier = 'common') {
    return FIELD_FORBIDDEN_RARITIES_BY_TIER[encounterTier]
        ? encounterTier
        : 'common';
}

function isForbiddenFieldRarity(item, encounterTier = 'common', options = {}) {
    if (!item?.rarity) return false;
    if (canDropMythic(options)) return false;

    const tier = getPolicyTier(encounterTier);
    return FIELD_FORBIDDEN_RARITIES_BY_TIER[tier].has(item.rarity);
}

function replaceRarityText(text, targetRarity) {
    if (!text) return text;

    return String(text)
        .replace(/M\u00edtico/gi, targetRarity)
        .replace(/Lend\u00e1rio/gi, targetRarity);
}

function getMaxRarityForTier(encounterTier = 'common') {
    const tier = FIELD_DROP_MAX_RARITY_BY_TIER[encounterTier]
        ? encounterTier
        : 'common';

    return FIELD_DROP_MAX_RARITY_BY_TIER[tier];
}

function downgradeForbiddenFieldDrop(item, encounterTier = 'common', options = {}) {
    if (!item || !isForbiddenFieldRarity(item, encounterTier, options)) {
        return item;
    }

    const targetRarity = getMaxRarityForTier(encounterTier);

    return {
        ...item,
        name: replaceRarityText(item.name, targetRarity),
        rarity: targetRarity,
        qualityLabel: targetRarity,
        powerTier: item.powerTier === RARITY_MYTHIC || item.powerTier === RARITY_LEGENDARY
            ? targetRarity
            : item.powerTier,
        flavor: replaceRarityText(item.flavor, targetRarity),
        __rarityPolicyAdjusted: true
    };
}

function generatePolicyCompliantDrop(mapNumber, dropOptions = {}, policyOptions = {}) {
    const encounterTier = dropOptions.encounterTier || 'common';
    let fallback = null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
        const rolledItem = generateDrop(mapNumber, dropOptions);

        if (!fallback) {
            fallback = rolledItem;
        }

        if (!isForbiddenFieldRarity(rolledItem, encounterTier, policyOptions)) {
            return rolledItem;
        }
    }

    return downgradeForbiddenFieldDrop(fallback, encounterTier, policyOptions);
}

module.exports = {
    FIELD_FORBIDDEN_RARITIES_BY_TIER,
    FIELD_DROP_MAX_RARITY_BY_TIER,
    canDropMythic,
    isDungeonOrExternalDrop,
    isForbiddenFieldRarity,
    replaceRarityText,
    getMaxRarityForTier,
    downgradeForbiddenFieldDrop,
    generatePolicyCompliantDrop
};
