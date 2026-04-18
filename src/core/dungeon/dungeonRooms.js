const { enemyPools } = require('../world/enemies');
const { getMapById, maps } = require('../world/maps');

function safeNumber(val) {
    return Number.isFinite(Number(val)) ? Number(val) : 0;
}

function getMapNumber(mapId) {
    const mapMap = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4,
        citadela_lunar: 5,
        abismo_noctra: 6
    };

    return mapMap[mapId] || 1;
}

function getDungeonMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function getDungeonEnemyPool(mapId) {
    const pool = enemyPools[mapId] || enemyPools.clareira_sombria;

    return {
        common: pool.common || [],
        elite: pool.elite || [],
        boss: pool.boss || []
    };
}

function weightedPick(entries) {
    const total = entries.reduce((sum, e) => sum + (e.weight || 0), 0);
    let roll = Math.random() * total;

    for (const e of entries) {
        roll -= e.weight || 0;
        if (roll <= 0) return e.value;
    }

    return entries[0]?.value || 'combat';
}

function buildDungeonRoomTypes(maxRooms = 5) {
    const middleRoomCount = Math.max(3, maxRooms - 2);
    const middleRooms = [];

    for (let i = 0; i < middleRoomCount; i++) {
        middleRooms.push(weightedPick([
            { value: 'combat', weight: 30 },
            { value: 'treasure', weight: 18 },
            { value: 'heal', weight: 18 },
            { value: 'curse', weight: 12 },
            { value: 'elite', weight: 16 },
            { value: 'shrine', weight: 6 }
        ]));
    }

    const types = ['combat', ...middleRooms, 'boss'];

    if (!types.includes('treasure') && types.length > 2) types[1] = 'treasure';
    if (!types.includes('heal') && types.length > 3) types[2] = 'heal';
    if (!types.includes('elite') && types.length > 2) types[types.length - 2] = 'elite';

    return types;
}

function getRandomDungeonEnemy(mapId, type, playerLevel, roomIndex) {
    const pool = getDungeonEnemyPool(mapId);
    const baseLevel = Math.max(1, safeNumber(playerLevel) + safeNumber(roomIndex) - 1);
    const bonus = type === 'boss' ? 2 : (type === 'elite' ? 1 : 0);
    const level = baseLevel + bonus;

    let enemyTemplate;

    if (type === 'boss') {
        enemyTemplate = pool.boss.length
            ? pool.boss[Math.floor(Math.random() * pool.boss.length)]
            : { name: 'Guardião do Vazio', emoji: '👑' };
    } else if (type === 'elite') {
        enemyTemplate = pool.elite.length
            ? pool.elite[Math.floor(Math.random() * pool.elite.length)]
            : { name: 'Elite Sombria', emoji: '🔥' };
    } else {
        enemyTemplate = pool.common.length
            ? pool.common[Math.floor(Math.random() * pool.common.length)]
            : { name: 'Criatura Sombria', emoji: '👹' };
    }

    const hp = type === 'boss'
        ? 170 + level * 42
        : (type === 'elite' ? 110 + level * 28 : 70 + level * 18);

    const atk = type === 'boss'
        ? 14 + level * 4
        : (type === 'elite' ? 10 + level * 3 : 7 + level * 2);

    const def = type === 'boss'
        ? 10 + level * 3
        : (type === 'elite' ? 8 + level * 2 : 5 + level);

    const crit = type === 'boss'
        ? 12
        : (type === 'elite' ? 10 : 6);

    const xp = type === 'boss'
        ? 110 + level * 18
        : (type === 'elite' ? 65 + level * 12 : 35 + level * 8);

    const gold = type === 'boss'
        ? 110 + level * 20
        : (type === 'elite' ? 60 + level * 12 : 25 + level * 8);

    return {
        id: `${type}_${roomIndex}_${Date.now()}`,
        name: enemyTemplate.name,
        emoji: enemyTemplate.emoji || '👹',
        hp,
        maxHp: hp,
        atk,
        def,
        crit,
        level,
        xp,
        gold,
        isElite: type === 'elite',
        isBoss: type === 'boss',
        ability: enemyTemplate.ability || null,
        frozen: false
    };
}

function createDungeonRoom(player, index, type) {
    const mapId = player.currentMap || 'clareira_sombria';

    const meta = {
        combat: {
            emoji: '⚔️',
            title: 'Sala de Conflito',
            desc: 'Câmara tomada por sombras.'
        },
        elite: {
            emoji: '🔥',
            title: 'Câmara de Elite',
            desc: 'Algo forte está à espreita.'
        },
        treasure: {
            emoji: '🎁',
            title: 'Sala do Tesouro',
            desc: 'Relíquias espalhadas.'
        },
        heal: {
            emoji: '❤️',
            title: 'Fonte Sombria',
            desc: 'Energia ancestral pulsa.'
        },
        curse: {
            emoji: '💀',
            title: 'Santuário Corrompido',
            desc: 'Escolhas trazem poder e dor.'
        },
        shrine: {
            emoji: '✨',
            title: 'Santuário Arcano',
            desc: 'Uma bênção antiga emana deste altar.'
        },
        boss: {
            emoji: '👑',
            title: 'Trono do Guardião',
            desc: 'O guardião final bloqueia a passagem.'
        }
    }[type] || {
        emoji: '❓',
        title: type,
        desc: ''
    };

    const room = {
        index,
        type,
        emoji: meta.emoji,
        title: meta.title,
        description: meta.desc,
        cleared: false,
        clearedAt: null,
        enemy: null,
        reward: null
    };

    if (type === 'combat' || type === 'elite' || type === 'boss') {
        room.enemy = getRandomDungeonEnemy(mapId, type, player.level || 1, index);
    }

    return room;
}

module.exports = {
    safeNumber,
    getMapNumber,
    getDungeonMap,
    getDungeonEnemyPool,
    weightedPick,
    buildDungeonRoomTypes,
    getRandomDungeonEnemy,
    createDungeonRoom
};