const Player = require('./PlayerModel');
const mongoose = require('mongoose');
const { ensureCosmeticsState } = require('./cosmetics');

let isConnected = false;

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
ATUALIZAR BUFFS (REMOVER EXPIRADOS)
=================================
*/

function updateBuffs(player) {
    if (!Array.isArray(player.buffs)) player.buffs = [];

    const now = Date.now();
    player.buffs = player.buffs.filter(buff => {
        if (!buff.expiresAt) return true;
        return buff.expiresAt > now;
    });

    return player;
}

/*
=================================
RECALCULAR ESTATÍSTICAS (COM BUFFS)
=================================
*/

function recalculateStats(player) {
    const BASE_STATS = {
        guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
        mago: { atk: 18, def: 4, hp: 80, crit: 8 },
        arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
    };

    updateBuffs(player);

    const previousMaxHp = Number(player.maxHp) || 0;
    const previousHp = player.hp !== undefined && player.hp !== null ? Number(player.hp) : null;
    const hpRatio = previousHp !== null && previousMaxHp > 0 ? previousHp / previousMaxHp : null;

    const base = BASE_STATS[player.class] || BASE_STATS.guerreiro;

    let atk = base.atk + ((player.level || 1) - 1) * 3;
    let def = base.def + Math.floor(((player.level || 1) - 1) * 1.5);
    let maxHp = base.hp + ((player.level || 1) - 1) * 20;
    let crit = base.crit;

    if (player.equipment) {
        Object.values(player.equipment).forEach(item => {
            if (!item) return;
            atk += item.atk || 0;
            def += item.def || 0;
            maxHp += item.hp || 0;
            crit += item.crit || 0;
        });
    }

    if (Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped.forEach(soul => {
            if (!soul?.effect) return;
            atk += soul.effect.atkBonus || 0;
            def += soul.effect.defBonus || 0;
            maxHp += soul.effect.hpBonus || 0;
            crit += soul.effect.critBonus || 0;
        });
    }

    if (Array.isArray(player.buffs)) {
        player.buffs.forEach(buff => {
            atk += buff.atk || 0;
            def += buff.def || 0;
            maxHp += buff.hp || 0;
            crit += buff.crit || 0;
        });
    }

    player.atk = Math.max(1, atk);
    player.def = Math.max(0, def);
    player.maxHp = Math.max(10, maxHp);
    player.crit = Math.min(75, crit);

    if (previousHp === null || previousMaxHp === 0) {
        player.hp = player.maxHp;
    } else {
        player.hp = Math.max(1, Math.min(Math.round(player.maxHp * hpRatio), player.maxHp));
    }

    return player;
}

/*
=================================
ACTIVE FIGHT
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

function mergePreservedFields(existingPlayer, incomingPlayer) {
    if (!existingPlayer) return incomingPlayer;

    if (
        existingPlayer.activeFight &&
        !incomingPlayer.activeFight
    ) {
        incomingPlayer.activeFight = existingPlayer.activeFight;
    }

    return incomingPlayer;
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

    player.maxEnergy ??= player.vip ? 40 : 20;
    player.energy ??= player.maxEnergy;
    player.lastEnergyUpdate ??= Date.now();

    player.inventory ??= [];
    player.inventory = player.inventory.map(migrateItemSlot);

    player.bonusInventory ??= 0;
    player.maxInventory = 20 + (player.bonusInventory || 0);

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

    ensureCosmeticsState(player);
    player.lastDailyChest ??= null;

    player.renamed ??= false;
    player.classChanged ??= false;

    ensureActiveFightState(player);

    player.createdAt ??= Date.now();
    player.updatedAt ??= Date.now();

    player.hp ??= 120;
    player.maxHp ??= 120;
    player.atk ??= 12;
    player.def ??= 10;
    player.crit ??= 5;

    return player;
}

/*
=================================
MONGO
=================================
*/

async function connectToMongo() {
    if (isConnected) return;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI não definida');

    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000
    });

    isConnected = true;
}

/*
=================================
GET PLAYER
=================================
*/

async function getPlayer(id) {
    await connectToMongo();

    const player = await Player.findOne({ id });
    if (!player) {
        return null;
    }

    const playerObj = player.toObject();
    ensurePlayerState(playerObj);
    updateBuffs(playerObj);

    return playerObj;
}

/*
=================================
SAVE PLAYER
=================================
*/

async function savePlayer(id, playerData) {
    await connectToMongo();

    const existing = await Player.findOne({ id }).lean();

    const { _id, ...updateData } = playerData;
    ensurePlayerState(updateData);
    mergePreservedFields(existing, updateData);

    const currentHp = updateData.hp;
    recalculateStats(updateData);

    if (currentHp !== undefined && currentHp !== null) {
        updateData.hp = Math.max(1, Math.min(currentHp, updateData.maxHp));
    }

    updateData.energy = Math.max(
        0,
        Math.min(updateData.energy ?? updateData.maxEnergy, updateData.maxEnergy)
    );

    ensureActiveFightState(updateData);
    updateData.updatedAt = new Date();

    const result = await Player.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true, upsert: true }
    );

    const saved = result.toObject();
    ensurePlayerState(saved);

    return saved;
}

/*
=================================
GET ALL PLAYERS
=================================
*/

async function getAllPlayers() {
    await connectToMongo();
    const players = await Player.find({}).lean();
    const playersMap = {};

    for (const player of players) {
        ensurePlayerState(player);
        playersMap[player.id] = player;
    }

    return playersMap;
}

/*
=================================
COLLECTION
=================================
*/

async function getPlayerCollection() {
    await connectToMongo();
    return Player.collection;
}

/*
=================================
CRIAR NOVO JOGADOR
=================================
*/

async function createPlayer(id, name, className) {
    await connectToMongo();

    const existing = await Player.findOne({ id });
    if (existing) {
        throw new Error('Jogador já existe.');
    }

    const allowedClasses = ['guerreiro', 'arqueiro', 'mago'];
    if (!allowedClasses.includes(className)) {
        className = 'guerreiro';
    }

    const player = new Player({
        id,
        name,
        class: className
    });

    await player.save();

    const playerObj = player.toObject();
    ensurePlayerState(playerObj);
    recalculateStats(playerObj);
    playerObj.hp = playerObj.maxHp;
    playerObj.energy = playerObj.maxEnergy;

    await savePlayer(id, playerObj);
    return playerObj;
}

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats,
    updateBuffs,
    connectToMongo,
    ensurePlayerState,
    ensureActiveFightState,
    getPlayerCollection,
    getAllPlayers,
    createPlayer
};