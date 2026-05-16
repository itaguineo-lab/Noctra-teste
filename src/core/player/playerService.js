const Player = require('./PlayerModel');
const mongoose = require('mongoose');

const { ensureCosmeticsState } = require('./cosmetics');
const {
    preserveTransientStates,
    sanitizePlayerForPersistence
} = require('./playerSaveGuard');

const {
    ensureEnergyFields,
    syncEnergyCapacity,
    updateEnergy
} = require('../../services/energyService');

const { BALANCE } = require('../../data/balance');

let isConnected = false;

// Cache simples em memória para reduzir leituras no MongoDB
const playerCache = new Map();
const CACHE_TTL = 5 * 1000; // 5 segundos de cache

const PLAYER_LIST_PROJECTION = {
    id: 1,
    name: 1,
    class: 1,
    level: 1,
    xp: 1,
    hp: 1,
    maxHp: 1,
    atk: 1,
    def: 1,
    crit: 1,
    maxEnergy: 1,
    energy: 1,
    gold: 1,
    nox: 1,
    glorias: 1,
    keys: 1,
    currentMap: 1,
    totalKills: 1,
    buffs: 1,
    equipment: 1,
    soulsEquipped: 1,
    arena: 1,
    vip: 1,
    vipExpires: 1,
    bonusInventory: 1,
    maxInventory: 1,
    lastActive: 1,
    activeFight: 1,
    activeArenaBattle: 1,
    consumables: 1,
    cosmetics: 1,
    activeCosmetics: 1
};

/*
=================================
ID HELPERS
=================================
*/

function getPlayerIdVariants(id) {
    const values = [];
    const safeString = String(id || '').trim();

    if (safeString) values.push(safeString);

    const numeric = Number(safeString);
    if (safeString && Number.isSafeInteger(numeric)) {
        values.push(numeric);
    }

    return [...new Set(values)];
}

function buildPlayerIdQuery(id) {
    const variants = getPlayerIdVariants(id);

    if (variants.length === 1) {
        return { id: variants[0] };
    }

    return { id: { $in: variants } };
}

async function findPlayerByTelegramId(id, projection = null, options = {}) {
    const query = buildPlayerIdQuery(id);
    return Player.findOne(query, projection, options);
}

/*
=================================
VIP HELPERS
=================================
*/

function parseVipExpires(value) {
    if (!value) return null;

    if (value instanceof Date) {
        const ts = value.getTime();
        return Number.isFinite(ts) ? ts : null;
    }

    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;

    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    return null;
}

function isVipActive(player) {
    if (!player?.vip) return false;
    if (!player.vipExpires) return true;

    const expiresAt = parseVipExpires(player.vipExpires);
    if (!Number.isFinite(expiresAt)) return false;

    return expiresAt > Date.now();
}

function normalizeVipState(player) {
    if (!player || typeof player !== 'object') return player;

    player.vip = Boolean(player.vip);

    if (!player.vip) {
        player.vipExpires = null;
        return player;
    }

    if (!player.vipExpires) {
        return player;
    }

    const expiresAt = parseVipExpires(player.vipExpires);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        player.vip = false;
        player.vipExpires = null;
        return player;
    }

    player.vipExpires = new Date(expiresAt).toISOString();
    return player;
}

/*
=================================
MIGRAÇÃO DE ITENS ANTIGOS
=================================
*/

function migrateItemSlot(item) {
    if (!item || typeof item !== 'object') return item;

    const originalSlot = item.slot;
    if (!originalSlot) return item;

    const validSlots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const validSlot of validSlots) {
        if (String(originalSlot).startsWith(validSlot) && originalSlot !== validSlot) {
            item.slot = validSlot;
            break;
        }
    }

    return item;
}

/*
=================================
BUFFS
=================================
*/

function updateBuffs(player) {
    if (!Array.isArray(player.buffs)) player.buffs = [];

    const now = Date.now();
    player.buffs = player.buffs.filter(buff => {
        if (!buff.expiresAt) return true;
        return Number(buff.expiresAt) > now;
    });

    return player;
}

/*
=================================
ACTIVE STATES
=================================
*/

function ensureActiveFightState(player) {
    player.activeFight ??= null;

    if (!player.activeFight) return player;

    player.activeFight.mode ??= 'hunt';
    player.activeFight.createdAt ??= Date.now();
    player.activeFight.expiresAt ??= player.activeFight.createdAt + (10 * 60 * 1000);
    player.activeFight.battleMessageId ??= null;
    player.activeFight.isPhoto ??= false;
    player.activeFight.payload ??= null;

    return player;
}

function ensureActiveArenaBattleState(player) {
    player.activeArenaBattle ??= null;

    if (!player.activeArenaBattle) return player;

    player.activeArenaBattle.mode ??= 'arena';
    player.activeArenaBattle.createdAt ??= Date.now();
    player.activeArenaBattle.expiresAt ??= player.activeArenaBattle.createdAt + (10 * 60 * 1000);
    player.activeArenaBattle.messageId ??= null;
    player.activeArenaBattle.payload ??= null;

    return player;
}

/*
=================================
BALANCE HELPERS
=================================
*/

function getBaseInventoryCapacity(player) {
    return isVipActive(player)
        ? BALANCE.inventory.vipMax
        : BALANCE.inventory.baseMax;
}

function applyInventoryCapacity(player) {
    player.bonusInventory ??= 0;
    player.maxInventory = getBaseInventoryCapacity(player) + (player.bonusInventory || 0);
    return player.maxInventory;
}

/*
=================================
ESTADO PADRÃO
=================================
*/

function ensurePlayerState(player) {
    if (!player) return {};
    if (!player.id) throw new Error('Player sem ID');

    player.name ??= 'Viajante';
    player.class ??= 'guerreiro';

    player.level ??= 1;
    player.xp ??= 0;

    player.gold ??= 100;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.keys ??= 0;

    player.vip ??= false;
    player.vipExpires ??= null;
    normalizeVipState(player);

    ensureEnergyFields(player);
    syncEnergyCapacity(player);

    player.inventory ??= [];
    player.inventory = player.inventory.map(migrateItemSlot);

    applyInventoryCapacity(player);

    player.consumables ??= {
        potionHp: 0,
        potionEnergy: 0,
        tonicStrength: 0,
        tonicDefense: 0
    };

    player.buffs ??= [];
    player.equipment ??= {};

    const slots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];
    slots.forEach(slot => {
        if (!(slot in player.equipment)) player.equipment[slot] = null;
        if (player.equipment[slot]) {
            player.equipment[slot] = migrateItemSlot(player.equipment[slot]);
        }
    });

    player.soulsInventory ??= [];
    player.soulsEquipped ??= [null, null];

    player.totalKills ??= 0;
    player.achievements ??= {};

    player.currentMap ??= 'clareira_sombria';
    player.dungeonProgress ??= null;
    player.lastDungeonRun ??= 0;
    player.soulPityCounter ??= 0;

    player.arena ??= null;

    ensureCosmeticsState(player);
    player.lastDailyChest ??= null;

    player.renamed ??= false;
    player.classChanged ??= false;

    ensureActiveFightState(player);
    ensureActiveArenaBattleState(player);

    player.createdAt ??= new Date();
    player.updatedAt ??= new Date();

    player.hp ??= 120;
    player.maxHp ??= 120;
    player.atk ??= 12;
    player.def ??= 10;
    player.crit ??= 5;

    return player;
}

/*
=================================
RECALCULAR STATS
=================================
*/

function recalculateStats(player) {
    const BASE_STATS = {
        guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
        mago: { atk: 18, def: 4, hp: 80, crit: 8 },
        arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
    };

    ensurePlayerState(player);
    updateBuffs(player);
    syncEnergyCapacity(player);
    applyInventoryCapacity(player);

    const currentHp = Math.max(1, Number(player.hp || 1));
    const classBase = BASE_STATS[player.class] || BASE_STATS.guerreiro;
    const level = Math.max(1, Number(player.level || 1));

    let atk = classBase.atk + (level - 1) * 2;
    let def = classBase.def + (level - 1);
    let maxHp = classBase.hp + (level - 1) * 8;
    let crit = classBase.crit + Math.floor((level - 1) * 0.5);

    const eq = player.equipment || {};
    for (const slot of Object.keys(eq)) {
        const item = eq[slot];
        if (!item) continue;

        atk += Number(item.atk || 0);
        def += Number(item.def || 0);
        maxHp += Number(item.hp || 0);
        crit += Number(item.crit || 0);
    }

    const buffs = Array.isArray(player.buffs) ? player.buffs : [];
    for (const buff of buffs) {
        atk += Number(buff.atk || 0);
        def += Number(buff.def || 0);
        maxHp += Number(buff.hp || 0);
        crit += Number(buff.crit || 0);
    }

    const souls = Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [];
    for (const soul of souls) {
        if (!soul?.effect || soul.effect.type !== 'passive') continue;

        atk += Number(soul.effect.atkBonus || 0);
        def += Number(soul.effect.defBonus || 0);
        maxHp += Number(soul.effect.hpBonus || 0);
        crit += Number(soul.effect.critBonus || 0);
    }

    player.atk = Math.max(1, Math.round(atk));
    player.def = Math.max(0, Math.round(def));
    player.maxHp = Math.max(1, Math.round(maxHp));
    player.crit = Math.max(0, Math.round(crit));
    player.hp = Math.max(1, Math.min(currentHp, player.maxHp));

    return player;
}

/*
=================================
MONGO
=================================
*/

async function connectToMongo() {
    if (isConnected) return;

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI/MONGO_URI não configurado.');
    }

    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log('✅ MongoDB conectado.');
}

/*
=================================
CREATE PLAYER
=================================
*/

async function createPlayer(id, name, className) {
    const safeId = String(id);
    const safeName = String(name || '').trim();
    const safeClass = String(className || '').trim();

    const allowedClasses = ['guerreiro', 'arqueiro', 'mago'];

    if (!safeName || safeName.length < 3 || safeName.length > 20) {
        throw new Error('Nome inválido.');
    }

    if (!allowedClasses.includes(safeClass)) {
        throw new Error('Classe inválida.');
    }

    const existing = await findPlayerByTelegramId(safeId);
    if (existing) {
        existing.id = safeId;
        ensurePlayerState(existing);
        updateEnergy(existing);
        recalculateStats(existing);
        await existing.save();
        return existing;
    }

    const player = new Player({
        id: safeId,
        name: safeName,
        class: safeClass
    });

    ensurePlayerState(player);
    recalculateStats(player);
    player.hp = player.maxHp;
    player.energy = player.maxEnergy;

    await player.save();
    return player;
}

/*
=================================
GET / SAVE
=================================
*/

async function getPlayer(id) {
    const safeId = String(id);
    
    // Tenta pegar do cache
    const cached = playerCache.get(safeId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    const player = await findPlayerByTelegramId(safeId);
    if (!player) return null;

    if (String(player.id) !== safeId) {
        player.id = safeId;
    }

    ensurePlayerState(player);
    updateEnergy(player);
    recalculateStats(player);

    // Salva no cache
    playerCache.set(safeId, {
        data: player,
        timestamp: Date.now()
    });

    return player;
}

async function savePlayer(id, playerData) {
    const safeId = String(id);

    let current = null;
    if (!playerData?.activeFight || !playerData?.activeArenaBattle) {
        current = await findPlayerByTelegramId(
            safeId,
            { activeFight: 1, activeArenaBattle: 1 },
            { lean: true }
        );
    }

    const transientState = preserveTransientStates(current, playerData);

    ensurePlayerState(playerData);
    updateBuffs(playerData);
    updateEnergy(playerData);
    recalculateStats(playerData);

    playerData.updatedAt = new Date();

    const sanitized = sanitizePlayerForPersistence({
        ...playerData,
        ...transientState,
        id: safeId
    });

    const existing = await findPlayerByTelegramId(safeId, { _id: 1 }, { lean: true });
    const filter = existing?._id
        ? { _id: existing._id }
        : { id: safeId };

    const updated = await Player.findOneAndUpdate(
        filter,
        sanitized,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Invalida/Atualiza cache após salvar
    if (updated) {
        playerCache.set(safeId, {
            data: updated,
            timestamp: Date.now()
        });
    }
}

/*
=================================
COLLECTION / UTILS
=================================
*/

async function getPlayerCollection() {
    return mongoose.connection.collection('players');
}

async function getAllPlayers() {
    const players = await Player.find({}, PLAYER_LIST_PROJECTION).lean();
    const roster = [];

    for (const player of players) {
        ensurePlayerState(player);
        updateEnergy(player);
        recalculateStats(player);
        roster.push(player);
    }

    return roster;
}

module.exports = {
    connectToMongo,
    createPlayer,
    getPlayer,
    savePlayer,
    getPlayerCollection,
    getAllPlayers,
    ensurePlayerState,
    recalculateStats,
    updateBuffs,
    applyInventoryCapacity,
    isVipActive,
    normalizeVipState,
    getPlayerIdVariants,
    buildPlayerIdQuery,
    findPlayerByTelegramId
};
