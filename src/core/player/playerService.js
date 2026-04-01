const fs = require('fs');
const path = require('path');

const playersFilePath = path.join(__dirname, '../../data/players.json');

let playersCache = null;
let saveTimeout = null;

const BASE_STATS = {
    guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
    mago: { atk: 18, def: 4, hp: 80, crit: 8 },
    arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
};

const EQUIPMENT_SLOTS = [
    'weapon',
    'armor',
    'necklace',
    'ring',
    'boots',
    'quiver',
    'backpack'
];

function ensureEquipment(player) {
    if (!player.equipment) player.equipment = {};

    EQUIPMENT_SLOTS.forEach(slot => {
        if (!(slot in player.equipment)) {
            player.equipment[slot] = null;
        }
    });
}

function loadPlayersToCache() {
    try {
        if (!fs.existsSync(playersFilePath)) {
            playersCache = {};
            return;
        }

        playersCache = JSON.parse(
            fs.readFileSync(playersFilePath, 'utf8')
        );

        Object.values(playersCache).forEach(player => {
            ensureEquipment(player);

            if (!Array.isArray(player.inventory)) {
                player.inventory = [];
            }

            if (!Array.isArray(player.soulsEquipped)) {
                player.soulsEquipped = [null, null];
            }
        });

    } catch (error) {
        console.error(error);
        playersCache = {};
    }
}

function flushCacheToDisk() {
    if (!playersCache) return;

    fs.writeFileSync(
        playersFilePath,
        JSON.stringify(playersCache, null, 2)
    );
}

function scheduleSave() {
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        flushCacheToDisk();
    }, 1000);
}

function createDefaultPlayer(id, name = 'Viajante') {
    const player = {
        id,
        name,
        class: 'guerreiro',
        level: 1,
        xp: 0,
        gold: 100,
        nox: 0,

        hp: 120,
        maxHp: 120,
        atk: 12,
        def: 10,
        crit: 5,

        energy: 20,
        maxEnergy: 20,

        inventory: [],
        equipment: {},
        soulsEquipped: [null, null],

        currentMap: 'clareira_sombria',
        totalKills: 0
    };

    ensureEquipment(player);
    return player;
}

function getPlayer(id, name = 'Viajante') {
    if (!playersCache) loadPlayersToCache();

    if (!playersCache[id]) {
        playersCache[id] = createDefaultPlayer(id, name);
        scheduleSave();
    }

    return playersCache[id];
}

function savePlayer(id, player) {
    ensureEquipment(player);
    playersCache[id] = player;
    scheduleSave();
}

function recalculateStats(player) {
    const base =
        BASE_STATS[player.class] || BASE_STATS.guerreiro;

    let atk = base.atk + (player.level - 1) * 3;
    let def = base.def + (player.level - 1) * 2;
    let maxHp = base.hp + (player.level - 1) * 20;
    let crit = base.crit;

    ensureEquipment(player);

    Object.values(player.equipment).forEach(item => {
        if (!item) return;

        atk += item.atk || 0;
        def += item.def || 0;
        maxHp += item.hp || 0;
        crit += item.crit || 0;
    });

    player.atk = atk;
    player.def = def;
    player.maxHp = maxHp;
    player.crit = crit;

    if (player.hp > maxHp) {
        player.hp = maxHp;
    }

    return player;
}

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats
};