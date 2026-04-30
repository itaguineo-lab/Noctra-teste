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

function getMapLevelRange(mapId = 'clareira_sombria') {
    return {
        clareira_sombria: { min: 1, max: 8 },
        cripta_em_ruinas: { min: 8, max: 15 },
        pantano_corrompido: { min: 15, max: 24 },
        deserto_incandescente: { min: 24, max: 32 },
        citadela_lunar: { min: 32, max: 42 },
        abismo_noctra: { min: 42, max: 55 }
    }[mapId] || { min: 1, max: 8 };
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

function getDungeonRoomLevel(mapId, type, playerLevel, roomIndex) {
    const range = getMapLevelRange(mapId);
    const safeRoomIndex = Math.max(0, safeNumber(roomIndex));
    const safePlayerLevel = Math.max(1, safeNumber(playerLevel) || range.min);

    const typeBonus = type === 'boss' ? 3 : (type === 'elite' ? 2 : 1);
    const roomProgressBonus = Math.max(0, safeRoomIndex - 1);

    /*
    Dungeon precisa ser mais forte que o farm do mesmo mapa,
    mas não pode virar "conteúdo do level atual".
    Se um jogador Lv.32 entra na dungeon da Clareira, a dungeon continua sendo da Clareira.
    */
    const overlevelBonus = Math.min(2, Math.floor(Math.max(0, safePlayerLevel - range.max) / 10));
    const rawLevel = range.min + roomProgressBonus + typeBonus + overlevelBonus;
    const cap = range.max + (type === 'boss' ? 3 : (type === 'elite' ? 2 : 1));

    return Math.max(range.min + 1, Math.min(rawLevel, cap));
}

function getDungeonStatScale(type, roomIndex) {
    const safeRoomIndex = Math.max(0, safeNumber(roomIndex));
    const roomScalar = 1 + Math.max(0, safeRoomIndex - 1) * 0.06;

    if (type === 'boss') return roomScalar * 1.38;
    if (type === 'elite') return roomScalar * 1.22;
    return roomScalar * 1.10;
}

function scaleDungeonEnemyStats(enemyTemplate, mapId, type, playerLevel, roomIndex) {
    const level = getDungeonRoomLevel(mapId, type, playerLevel, roomIndex);
    const range = getMapLevelRange(mapId);
    const levelDelta = Math.max(0, level - range.min);
    const scalar = getDungeonStatScale(type, roomIndex);

    const baseHp = safeNumber(enemyTemplate.hp) || (type === 'boss' ? 170 : (type === 'elite' ? 110 : 70));
    const baseAtk = safeNumber(enemyTemplate.atk) || (type === 'boss' ? 14 : (type === 'elite' ? 10 : 7));
    const baseDef = safeNumber(enemyTemplate.def) || (type === 'boss' ? 10 : (type === 'elite' ? 8 : 5));
    const baseCrit = safeNumber(enemyTemplate.crit) || (type === 'boss' ? 12 : (type === 'elite' ? 10 : 6));
    const baseXp = safeNumber(enemyTemplate.xp) || (type === 'boss' ? 110 : (type === 'elite' ? 65 : 35));
    const baseGold = safeNumber(enemyTemplate.gold) || (type === 'boss' ? 110 : (type === 'elite' ? 60 : 25));

    return {
        hp: Math.max(1, Math.round(baseHp * scalar * (1 + levelDelta * 0.035))),
        atk: Math.max(1, Math.round(baseAtk * scalar * (1 + levelDelta * 0.025))),
        def: Math.max(0, Math.round(baseDef * scalar * (1 + levelDelta * 0.020))),
        crit: Math.min(35, Math.round(baseCrit + (type === 'boss' ? 2 : 0))),
        xp: Math.max(1, Math.round(baseXp * scalar * (1 + levelDelta * 0.030))),
        gold: Math.max(1, Math.round(baseGold * scalar * (1 + levelDelta * 0.030))),
        level
    };
}

function getRandomDungeonEnemy(mapId, type, playerLevel, roomIndex) {
    const pool = getDungeonEnemyPool(mapId);

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

    const stats = scaleDungeonEnemyStats(enemyTemplate, mapId, type, playerLevel, roomIndex);

    return {
        id: `${type}_${roomIndex}_${Date.now()}`,
        name: enemyTemplate.name,
        emoji: enemyTemplate.emoji || '👹',
        hp: stats.hp,
        maxHp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        crit: stats.crit,
        level: stats.level,
        xp: stats.xp,
        gold: stats.gold,
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
    getMapLevelRange,
    getDungeonMap,
    getDungeonEnemyPool,
    weightedPick,
    buildDungeonRoomTypes,
    getDungeonRoomLevel,
    getDungeonStatScale,
    scaleDungeonEnemyStats,
    getRandomDungeonEnemy,
    createDungeonRoom
};
