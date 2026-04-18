const {
    getDungeonMap,
    getMapNumber,
    buildDungeonRoomTypes,
    createDungeonRoom
} = require('./dungeonRooms');

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
    d.rewards ??= { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0 };
    d.summary ??= null;
    d.logs ??= [];
    d.combatBonus ??= { atk: 0, def: 0, crit: 0 };
    d.roomsVisited ??= 0;

    return d;
}

function getCurrentRoom(player) {
    const d = normalizeDungeonState(player);
    return d.rooms[d.currentRoomIndex] || null;
}

function startDungeonRun(player) {
    const d = normalizeDungeonState(player);
    const mapId = player.currentMap || 'clareira_sombria';
    const mapNumber = getMapNumber(mapId);
    const maxRooms = Math.min(7, 5 + Math.floor((mapNumber - 1) / 2));

    d.active = true;
    d.completed = false;
    d.aborted = false;
    d.startedAt = Date.now();
    d.mapId = mapId;
    d.maxRooms = maxRooms;
    d.currentRoomIndex = 0;
    d.rooms = buildDungeonRoomTypes(maxRooms).map((type, i) => createDungeonRoom(player, i + 1, type));
    d.rewards = { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0 };
    d.summary = null;
    d.combatBonus = { atk: 0, def: 0, crit: 0 };
    d.roomsVisited = 1;
    d.logs = ['🌑 Você adentrou a masmorra...'];

    return d;
}

module.exports = {
    normalizeDungeonState,
    getCurrentRoom,
    startDungeonRun,
    getDungeonMap
};