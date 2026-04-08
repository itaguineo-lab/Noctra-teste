/**
 * WORLD MAPS — NOCTRA
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
        recommendedPower: 10
    },
    {
        id: 'cripta_em_ruinas',
        name: 'Cripta em Ruínas',
        levelReq: 6,
        description: 'Os mortos caminham novamente entre pedras antigas.',
        emoji: '⚰️',
        dungeonName: 'Catacumbas Perdidas',
        recommendedPower: 30
    },
    {
        id: 'pantano_corrompido',
        name: 'Pântano Corrompido',
        levelReq: 12,
        description: 'Névoa tóxica e criaturas venenosas dominam a região.',
        emoji: '🍄',
        dungeonName: 'Covil da Putrefação',
        recommendedPower: 60
    },
    {
        id: 'deserto_incandescente',
        name: 'Deserto Incandescente',
        levelReq: 18,
        description: 'Calor mortal e bestas de areia.',
        emoji: '🏜️',
        dungeonName: 'Templo Escarlate',
        recommendedPower: 100
    },
    {
        id: 'citadela_lunar',
        name: 'Citadela Lunar',
        levelReq: 25,
        description: 'Uma fortaleza fria banhada pela lua eterna.',
        emoji: '🌙',
        dungeonName: 'Torre do Eclipse',
        recommendedPower: 160
    },
    {
        id: 'abismo_noctra',
        name: 'Abismo de Noctra',
        levelReq: 35,
        description: 'O coração sombrio do mundo.',
        emoji: '🌑',
        dungeonName: 'Trono do Vazio',
        recommendedPower: 240
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

module.exports = {
    maps,
    getMapById,
    getMapByName,
    getStartingMap,
    canPlayerEnter,
    getAvailableMaps,
    getNextLockedMap
};