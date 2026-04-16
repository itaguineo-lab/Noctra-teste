/**
 * WORLD MAPS — NOCTRA 2.0
 * Progressão macro do mundo
 */

const maps = [
    {
        id: 'clareira_sombria',
        name: 'Clareira Sombria',
        levelReq: 1,
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
        levelReq: 6,
        description: 'Os mortos caminham novamente entre pedras antigas.',
        emoji: '⚰️',
        dungeonName: 'Catacumbas Perdidas',
        recommendedPower: 30,
        theme: 'morte e ecos',
        lootTier: 2
    },
    {
        id: 'pantano_corrompido',
        name: 'Pântano Corrompido',
        levelReq: 12,
        description: 'Névoa tóxica e criaturas venenosas dominam a região.',
        emoji: '🍄',
        dungeonName: 'Covil da Putrefação',
        recommendedPower: 58,
        theme: 'veneno e decadência',
        lootTier: 3
    },
    {
        id: 'deserto_incandescente',
        name: 'Deserto Incandescente',
        levelReq: 18,
        description: 'Calor mortal, ruínas antigas e bestas de areia.',
        emoji: '🏜️',
        dungeonName: 'Templo Escarlate',
        recommendedPower: 96,
        theme: 'brasas e ruína',
        lootTier: 4
    },
    {
        id: 'citadela_lunar',
        name: 'Citadela Lunar',
        levelReq: 25,
        description: 'Uma fortaleza fria banhada pela lua eterna.',
        emoji: '🌙',
        dungeonName: 'Torre do Eclipse',
        recommendedPower: 155,
        theme: 'lua e vazio',
        lootTier: 5
    },
    {
        id: 'abismo_noctra',
        name: 'Abismo de Noctra',
        levelReq: 35,
        description: 'O coração sombrio do mundo, onde a própria realidade cede.',
        emoji: '🌑',
        dungeonName: 'Trono do Vazio',
        recommendedPower: 240,
        theme: 'vazio absoluto',
        lootTier: 6
    }
];

function getMapById(id) {
    return maps.find(map => map.id === id) || null;
}

function getMapByName(name) {
    return maps.find(map => map.name === name) || null;
}

function getStartingMap() {
    return maps[0];
}

function canPlayerEnter(player, mapId) {
    const map = getMapById(mapId);

    if (!map || !player) {
        return false;
    }

    return (player.level || 1) >= map.levelReq;
}

function getAvailableMaps(playerLevel = 1) {
    return maps.filter(
        map => playerLevel >= map.levelReq
    );
}

function getNextLockedMap(playerLevel = 1) {
    return maps.find(
        map => playerLevel < map.levelReq
    ) || null;
}

function getRecommendedMapForPlayer(playerPower = 0) {
    let best = maps[0];

    for (const map of maps) {
        if (playerPower >= map.recommendedPower) {
            best = map;
        }
    }

    return best;
}

module.exports = {
    maps,
    getMapById,
    getMapByName,
    getStartingMap,
    canPlayerEnter,
    getAvailableMaps,
    getNextLockedMap,
    getRecommendedMapForPlayer
};