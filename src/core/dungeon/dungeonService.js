const {
    getDungeonMap,
    getMapNumber,
    buildDungeonRoomTypes,
    createDungeonRoom
} = require('./dungeonRooms');

const {
    normalizeDungeonRoom
} = require('./dungeonBalanceGuards');

function normalizeDungeonState(player) {
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = {};
    }

    const d = player.dungeonProgress;

    d.active ??= false;
    d.completed ??= false;
    d.aborted ??= false;
    d.startedAt ??= null;
    d.mapId ??= player.currentMap || 'clareira_sombria';
    d.maxRooms ??= 5;
    d.currentRoomIndex ??= 0;
    d.rooms ??= [];
    d.rewards ??= { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0, souls: 0 };
    d.summary ??= null;
    d.logs ??= [];
    d.combatBonus ??= { atk: 0, def: 0, crit: 0 };
    d.roomsVisited ??= 0;

    if (Array.isArray(d.rooms)) {
        d.rooms = d.rooms.map(normalizeDungeonRoom);
    }

    return d;
}

function getCurrentRoom(player) {
    const d = normalizeDungeonState(player);
    return d.rooms[d.currentRoomIndex] || null;
}

function getDungeonRoomCountForMap(mapId) {
    const mapNumber = getMapNumber(mapId);

    /*
    O gerador atual de salas suporta 3 a 5 salas.
    Antes, o service podia marcar Pântano/Deserto como 6 salas, mas
    buildDungeonRoomTypes() limitava a lista real em 5. Resultado: UI 5/6,
    boss final aparecendo em 83% e métricas de sala incoerentes.

    Enquanto o gerador não suportar 6/7 salas de verdade, a regra correta é
    manter d.maxRooms exatamente igual ao número de salas geradas.
    */
    return Math.max(3, Math.min(5, 5 + Math.floor((mapNumber - 1) / 2)));
}

function startDungeonRun(player) {
    const d = normalizeDungeonState(player);
    const mapId = player.currentMap || 'clareira_sombria';
    const maxRooms = getDungeonRoomCountForMap(mapId);
    const roomTypes = buildDungeonRoomTypes(maxRooms);

    d.active = true;
    d.completed = false;
    d.aborted = false;
    d.startedAt = Date.now();
    d.mapId = mapId;
    d.maxRooms = roomTypes.length;
    d.currentRoomIndex = 0;
    d.rooms = roomTypes.map((type, i) => normalizeDungeonRoom(createDungeonRoom(player, i + 1, type)));
    d.rewards = { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0, souls: 0 };
    d.summary = null;
    d.combatBonus = { atk: 0, def: 0, crit: 0 };
    d.roomsVisited = 1;
    d.logs = ['🌑 Você adentrou a masmorra...'];

    return d;
}

module.exports = {
    normalizeDungeonState,
    getCurrentRoom,
    getDungeonRoomCountForMap,
    startDungeonRun,
    getDungeonMap
};
