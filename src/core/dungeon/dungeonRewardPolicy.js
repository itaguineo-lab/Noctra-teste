const COMMON_DUNGEON_MIN_RARITY_BY_MAP = {
    1: 'Incomum',
    2: 'Raro',
    3: 'Raro',
    4: 'Épico',
    5: 'Épico',
    6: 'Lendário'
};

const ELITE_DUNGEON_MIN_RARITY_BY_MAP = {
    1: 'Épico',
    2: 'Épico',
    3: 'Épico',
    4: 'Lendário',
    5: 'Lendário',
    6: 'Lendário'
};

function normalizeMapNumber(mapNumber = 1) {
    const parsed = Number(mapNumber);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(6, Math.floor(parsed)));
}

function getCompletionMinRarity(mapNumber = 1, isEliteDungeon = false) {
    const safeMapNumber = normalizeMapNumber(mapNumber);
    const table = isEliteDungeon
        ? ELITE_DUNGEON_MIN_RARITY_BY_MAP
        : COMMON_DUNGEON_MIN_RARITY_BY_MAP;

    return table[safeMapNumber] || table[6];
}

function getCompletionRarityBias(mapNumber = 1, isEliteDungeon = false) {
    const safeMapNumber = normalizeMapNumber(mapNumber);

    if (isEliteDungeon) {
        if (safeMapNumber >= 6) return 'endgame_boss';
        if (safeMapNumber >= 4) return 'late_boss';
        return 'mid_boss';
    }

    if (safeMapNumber >= 6) return 'endgame_boss';
    if (safeMapNumber >= 4) return 'late_boss';
    if (safeMapNumber >= 2) return 'mid_boss';
    return 'early_boss';
}

function buildCompletionDropOptions(player = {}, mapNumber = 1, isEliteDungeon = false) {
    return {
        encounterTier: 'boss',
        rarityBias: getCompletionRarityBias(mapNumber, isEliteDungeon),
        playerClass: player.class
    };
}

function buildCompletionDropPolicy(isEliteDungeon = false) {
    return {
        isDungeon: true,
        isEliteDungeon: Boolean(isEliteDungeon)
    };
}

function getCompletionBonus({ playerLevel = 1, clearedRooms = 0, isEliteDungeon = false } = {}) {
    const level = Math.max(1, Number(playerLevel) || 1);
    const cleared = Math.max(0, Number(clearedRooms) || 0);
    const eliteScalar = isEliteDungeon ? 1.35 : 1;

    return {
        xp: Math.floor((40 + cleared * 14 + level * 3.5) * eliteScalar),
        gold: Math.floor((90 + cleared * 24 + level * 7) * eliteScalar),
        glorias: isEliteDungeon ? 4 : 2
    };
}

function buildCompletionRewardTag(mapNumber = 1, isEliteDungeon = false) {
    const minRarity = getCompletionMinRarity(mapNumber, isEliteDungeon);
    return isEliteDungeon
        ? `Elite • mínimo ${minRarity}`
        : `Comum • mínimo ${minRarity}`;
}

module.exports = {
    COMMON_DUNGEON_MIN_RARITY_BY_MAP,
    ELITE_DUNGEON_MIN_RARITY_BY_MAP,
    normalizeMapNumber,
    getCompletionMinRarity,
    getCompletionRarityBias,
    buildCompletionDropOptions,
    buildCompletionDropPolicy,
    getCompletionBonus,
    buildCompletionRewardTag
};
