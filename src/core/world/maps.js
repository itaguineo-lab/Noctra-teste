/**
 * Configuração dos mapas do jogo.
 * Use sempre `id` como referência interna.
 */

const maps = [
    {
        id: 'clareira_sombria',
        name: 'Clareira Sombria',
        levelReq: 1,
        description: 'Um local denso onde a luz raramente toca o chão.',
        emoji: '🌲'
    },
    {
        id: 'cripta_em_ruinas',
        name: 'Cripta em Ruínas',
        levelReq: 8,
        description: 'Onde os mortos não descansam em paz.',
        emoji: '⚰️'
    },
    {
        id: 'pantano_corrompido',
        name: 'Pântano Corrompido',
        levelReq: 15,
        description: 'Águas paradas que escondem criaturas venenosas.',
        emoji: '🍄'
    },
    {
        id: 'deserto_incandescente',
        name: 'Deserto Incandescente',
        levelReq: 24,
        description: 'O calor é tão mortal quanto os escorpiões.',
        emoji: '🏜️'
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
    if (!map || !player) return false;

    return (player.level || 1) >= map.levelReq;
}

function getAvailableMaps(playerLevel = 1) {
    return maps.filter(map => playerLevel >= map.levelReq);
}

module.exports = {
    maps,
    getMapById,
    getMapByName,
    getStartingMap,
    canPlayerEnter,
    getAvailableMaps
};