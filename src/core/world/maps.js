/**
 * WORLD MAPS — NOCTRA 2.1
 * Progressão macro do mundo
 *
 * Regra oficial de progressão:
 * - Os level gates dos mapas precisam acompanhar os tiers de inimigos e drops.
 * - Esses valores estão alinhados com enemies.js e itemsV2.js.
 */

const MAP_LEVEL_REQUIREMENTS = {
    clareira_sombria: 1,
    cripta_em_ruinas: 8,
    pantano_corrompido: 15,
    deserto_incandescente: 24,
    citadela_lunar: 32,
    abismo_noctra: 42
};

const maps = [
    {
        id: 'clareira_sombria',
        name: 'Clareira Sombria',
        levelReq: MAP_LEVEL_REQUIREMENTS.clareira_sombria,
        description: 'Uma floresta densa onde a luz quase não alcança o solo.',
        emoji: '🌲',
        dungeonName: 'Bosque Profano',
        recommendedPower: 12,
        theme: 'natureza corrompida',
        lootTier: 1
    },
    {
        id: 'cripta_em_ruinas',
        name: 'Cripta em Ruínas',
        levelReq: MAP_LEVEL_REQUIREMENTS.cripta_em_ruinas,
        description: 'Os mortos caminham novamente entre pedras antigas.',
        emoji: '⚰️',
        dungeonName: 'Catacumbas Perdidas',
        recommendedPower: 42,
        theme: 'morte e ecos',
        lootTier: 2
    },
    {
        id: 'pantano_corrompido',
        name: 'Pântano Corrompido',
        levelReq: MAP_LEVEL_REQUIREMENTS.pantano_corrompido,
        description: 'Névoa tóxica e criaturas venenosas dominam a região.',
        emoji: '🍄',
        dungeonName: 'Covil da Putrefação',
        recommendedPower: 76,
        theme: 'veneno e decadência',
        lootTier: 3
    },
    {
        id: 'deserto_incandescente',
        name: 'Deserto Incandescente',
        levelReq: MAP_LEVEL_REQUIREMENTS.deserto_incandescente,
        description: 'Calor mortal, ruínas antigas e bestas de areia.',
        emoji: '🏜️',
        dungeonName: 'Templo Escarlate',
        recommendedPower: 128,
        theme: 'brasas e ruína',
        lootTier: 4
    },
    {
        id: 'citadela_lunar',
        name: 'Citadela Lunar',
        levelReq: MAP_LEVEL_REQUIREMENTS.citadela_lunar,
        description: 'Uma fortaleza fria banhada pela lua eterna.',
        emoji: '🌙',
        dungeonName: 'Torre do Eclipse',
        recommendedPower: 190,
        theme: 'lua e vazio',
        lootTier: 5
    },
    {
        id: 'abismo_noctra',
        name: 'Abismo de Noctra',
        levelReq: MAP_LEVEL_REQUIREMENTS.abismo_noctra,
        description: 'O coração sombrio do mundo, onde a própria realidade cede.',
        emoji: '🌑',
        dungeonName: 'Trono do Vazio',
        recommendedPower: 285,
        theme: 'vazio absoluto',
        lootTier: 6
    }
];

const MAPS_BY_ID = new Map(maps.map(map => [map.id, map]));
const MAPS_BY_NAME = new Map(maps.map(map => [map.name, map]));
const STARTING_MAP = maps[0] || null;

function getMapById(id) {
    if (!id) return null;
    return MAPS_BY_ID.get(id) || null;
}

function getMapByName(name) {
    if (!name) return null;
    return MAPS_BY_NAME.get(name) || null;
}

function getStartingMap() {
    return STARTING_MAP;
}

function canPlayerEnter(player, mapId) {
    const map = getMapById(mapId);

    if (!map || !player) {
        return false;
    }

    return (player.level || 1) >= map.levelReq;
}

function getAvailableMaps(playerLevel = 1) {
    const safeLevel = Number(playerLevel) || 1;
    return maps.filter(map => safeLevel >= map.levelReq);
}

function getNextLockedMap(playerLevel = 1) {
    const safeLevel = Number(playerLevel) || 1;
    for (const map of maps) {
        if (safeLevel < map.levelReq) {
            return map;
        }
    }
    return null;
}

function getRecommendedMapForPlayer(playerPower = 0) {
    const safePower = Number(playerPower) || 0;
    let best = STARTING_MAP;

    for (const map of maps) {
        if (safePower >= map.recommendedPower) {
            best = map;
        }
    }

    return best;
}

module.exports = {
    maps,
    MAP_LEVEL_REQUIREMENTS,
    getMapById,
    getMapByName,
    getStartingMap,
    canPlayerEnter,
    getAvailableMaps,
    getNextLockedMap,
    getRecommendedMapForPlayer
};
