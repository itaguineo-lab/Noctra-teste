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

const EQUIPMENT_SLOTS = ['weapon', 'armor', 'necklace', 'ring', 'boots'];

const DEFAULT_CONSUMABLES = {
    potionHp: 0,
    potionEnergy: 0,
    tonicStrength: 0,
    tonicDefense: 0
};

function getVipStatus(player) {
    const now = Date.now();
    const vipExpires = player.vipExpires ? new Date(player.vipExpires).getTime() : null;
    return Boolean(vipExpires && vipExpires > now);
}

function applyVipState(player) {
    player.vip = getVipStatus(player);
    player.maxEnergy = player.vip ? 40 : 20;
    player.maxInventory = player.vip ? 30 : 20;
    player.energy = Math.min(player.energy ?? player.maxEnergy, player.maxEnergy);
    return player;
}

function normalizeBuffs(player) {
    if (!Array.isArray(player.buffs)) player.buffs = [];
    player.buffs = player.buffs
        .map(buff => ({ ...buff, remainingTurns: Math.max(0, Number(buff.remainingTurns) || 0) }))
        .filter(buff => buff.remainingTurns > 0);
}

function updateBuffs(player) {
    normalizeBuffs(player);
    return player;
}

function ensureEquipmentSlots(player) {
    if (!player.equipment || typeof player.equipment !== 'object') player.equipment = {};
    EQUIPMENT_SLOTS.forEach(slot => {
        if (!Object.prototype.hasOwnProperty.call(player.equipment, slot)) player.equipment[slot] = null;
    });
    return player;
}

function recalculateStats(player) {
    const base = BASE_STATS[player.class] || BASE_STATS.guerreiro;
    let atk = base.atk + (player.level - 1) * 3;
    let def = base.def + (player.level - 1) * 2;
    let maxHp = base.hp + (player.level - 1) * 20;
    let crit = base.crit;

    ensureEquipmentSlots(player);
    Object.values(player.equipment).filter(Boolean).forEach(item => {
        atk += item.atk || 0;
        def += item.def || 0;
        maxHp += item.hp || 0;
        crit += item.crit || 0;
    });

    if (Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped.filter(Boolean).forEach(soul => {
            if (!soul?.effect) return;
            if (soul.effect.type === 'passive') {
                atk += soul.effect.atkBonus || 0;
                def += soul.effect.defBonus || 0;
                maxHp += soul.effect.hpBonus || 0;
                crit += soul.effect.critBonus || 0;
            }
        });
    }

    if (Array.isArray(player.buffs)) {
        player.buffs.forEach(buff => {
            if (buff.type === 'atk') atk += buff.value || 0;
            if (buff.type === 'def') def += buff.value || 0;
        });
    }

    player.atk = Math.max(1, Math.floor(atk));
    player.def = Math.max(0, Math.floor(def));
    player.maxHp = Math.max(10, Math.floor(maxHp));
    player.crit = Math.min(50, Math.floor(crit));
    if (typeof player.hp !== 'number') player.hp = player.maxHp;
    player.hp = Math.min(player.hp, player.maxHp);
    return player;
}

function ensurePlayerState(player) {
    if (!player) return null;
    player.name ??= 'Viajante';
    player.class ??= 'guerreiro';
    player.level ??= 1;
    player.xp ??= 0;
    player.gold ??= 100;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.keys ??= 0;
    player.energy ??= 20;
    player.lastEnergyUpdate ??= Date.now();
    player.inventory ??= [];
    player.consumables ??= { ...DEFAULT_CONSUMABLES };
    Object.keys(DEFAULT_CONSUMABLES).forEach(key => {
        if (typeof player.consumables[key] !== 'number') player.consumables[key] = 0;
    });
    player.buffs ??= [];
    normalizeBuffs(player);
    ensureEquipmentSlots(player);
    player.soulsInventory ??= [];
    player.soulsEquipped ??= [null, null];
    while (player.soulsEquipped.length < 2) player.soulsEquipped.push(null);
    player.totalKills ??= 0;
    player.achievements ??= {};
    player.currentMap ??= 'clareira_sombria';
    player.vip ??= false;
    player.vipExpires ??= null;
    player.createdAt ??= Date.now();
    player.updatedAt ??= Date.now();
    player.lastActive ??= Date.now();

    // NOVOS CAMPOS
    player.soulPityCounter ??= 0;
    player.lastDailyReset ??= 0;
    player.streak ??= 0;
    player.lastLoginDate ??= '';
    player.dailyMissions ??= {
        kills: 0,
        energySpent: 0,
        dailyChestCollected: false
    };

    applyVipState(player);
    recalculateStats(player);
    if (typeof player.hp !== 'number') player.hp = player.maxHp;
    player.hp = Math.min(player.hp, player.maxHp);
    return player;
}

function flushCacheToDisk() {
    if (!playersCache) return;
    try {
        fs.writeFileSync(playersFilePath, JSON.stringify(playersCache, null, 2));
    } catch (error) {
        console.error('Erro ao salvar jogadores:', error);
    }
}

function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        flushCacheToDisk();
        saveTimeout = null;
    }, 1000);
}

function loadPlayersToCache() {
    try {
        if (!fs.existsSync(playersFilePath)) {
            playersCache = {};
            return;
        }
        const data = fs.readFileSync(playersFilePath, 'utf8');
        playersCache = JSON.parse(data || '{}');
        Object.values(playersCache).forEach(player => ensurePlayerState(player));
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        playersCache = {};
    }
}

function createDefaultPlayer(id, name = 'Viajante') {
    return ensurePlayerState({ id, name });
}

function getPlayer(id, name = 'Viajante') {
    if (playersCache === null) loadPlayersToCache();
    if (!playersCache[id]) {
        playersCache[id] = createDefaultPlayer(id, name);
        scheduleSave();
    }
    const player = ensurePlayerState(playersCache[id]);
    player.lastActive = Date.now();
    return player;
}

function savePlayer(id, player) {
    if (playersCache === null) loadPlayersToCache();
    const normalizedPlayer = ensurePlayerState(player);
    normalizedPlayer.updatedAt = Date.now();
    normalizedPlayer.lastActive = Date.now();
    playersCache[id] = normalizedPlayer;
    scheduleSave();
}

function getAllPlayers() {
    if (playersCache === null) loadPlayersToCache();
    return playersCache;
}

process.once('beforeExit', flushCacheToDisk);
process.once('SIGINT', flushCacheToDisk);
process.once('SIGTERM', flushCacheToDisk);

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats,
    createDefaultPlayer,
    ensurePlayerState,
    flushCacheToDisk,
    getAllPlayers,
    updateBuffs
};