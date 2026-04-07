const Player = require('./PlayerModel');
const mongoose = require('mongoose');

let isConnected = false;

// Corrige os slots dos itens antigos (ex: 'armor_item_123' -> 'armor')
function migrateItemSlot(item) {
    if (!item || typeof item !== 'object') return item;
    const originalSlot = item.slot;
    if (!originalSlot) return item;

    const validSlots = ['weapon', 'armor', 'necklace', 'ring', 'boots'];
    for (const validSlot of validSlots) {
        if (originalSlot.startsWith(validSlot) && originalSlot !== validSlot) {
            item.slot = validSlot;
            console.log(`[Migração] Slot corrigido: ${originalSlot} -> ${validSlot} (item: ${item.name})`);
            break;
        }
    }
    return item;
}

function ensurePlayerState(player) {
    if (!player) return {};

    player.id ??= player.id;
    player.name ??= 'Viajante';
    player.class ??= 'guerreiro';
    player.level ??= 1;
    player.xp ??= 0;
    player.gold ??= 100;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.keys ??= 0;

    player.maxEnergy ??= player.vip ? 40 : 20;
    player.energy ??= player.maxEnergy;
    player.lastEnergyUpdate ??= Date.now();

    player.inventory ??= [];
    player.inventory = player.inventory.map(migrateItemSlot);

    player.bonusInventory ??= 0;
    player.maxInventory = 20 + (player.bonusInventory || 0);
    player.consumables ??= { potionHp: 0, potionEnergy: 0, tonicStrength: 0, tonicDefense: 0 };

    player.buffs ??= [];

    player.equipment ??= {};
    const EQUIPMENT_SLOTS = ['weapon', 'armor', 'necklace', 'ring', 'boots'];
    EQUIPMENT_SLOTS.forEach(slot => {
        if (!(slot in player.equipment)) player.equipment[slot] = null;
        if (player.equipment[slot]) {
            player.equipment[slot] = migrateItemSlot(player.equipment[slot]);
        }
    });

    player.soulsInventory ??= [];
    player.soulsEquipped ??= [null, null];

    player.totalKills ??= 0;
    player.achievements ??= {};
    player.lastActive ??= Date.now();

    player.currentMap ??= 'clareira_sombria';

    player.vip ??= false;
    player.vipExpires ??= null;
    player.renamed ??= false;
    player.classChanged ??= false;

    player.dungeonProgress ??= null;
    player.lastDungeonRun ??= 0;
    player.soulPityCounter ??= 0;
    player.cosmetics ??= [];

    player.lastDailyChest ??= null;

    player.createdAt ??= Date.now();
    player.updatedAt ??= Date.now();

    if (!player.maxHp) recalculateStats(player);
    player.hp ??= player.maxHp;

    return player;
}

async function connectToMongo() {
    if (isConnected) return;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ A variável de ambiente MONGODB_URI não está definida.');
        return;
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        console.log('✅ Conectado ao MongoDB');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error.message);
        throw error;
    }
}

async function getPlayer(id, name = 'Viajante') {
    await connectToMongo();
    let player = await Player.findOne({ id });

    if (!player) {
        player = new Player({ id, name });
        await player.save();
    }

    const playerObj = player.toObject();
    ensurePlayerState(playerObj);
    playerObj.lastActive = new Date();
    await savePlayer(id, playerObj);

    return playerObj;
}

async function savePlayer(id, playerData) {
    await connectToMongo();
    const { _id, ...updateData } = playerData;
    updateData.updatedAt = new Date();

    ensurePlayerState(updateData);

    const result = await Player.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true, upsert: true }
    );

    const savedObj = result.toObject();
    ensurePlayerState(savedObj);

    return savedObj;
}

async function getAllPlayers() {
    await connectToMongo();

    const players = await Player.find({});
    const cache = {};

    players.forEach(p => {
        const obj = p.toObject();
        ensurePlayerState(obj);
        cache[obj.id] = obj;
    });

    return cache;
}

async function getPlayerCollection() {
    await connectToMongo();
    return Player.collection;
}

function recalculateStats(player) {
    const BASE_STATS = {
        guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
        mago: { atk: 18, def: 4, hp: 80, crit: 8 },
        arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
    };

    const base = BASE_STATS[player.class] || BASE_STATS.guerreiro;

    let atk = base.atk + (player.level - 1) * 3;
    let def = base.def + (player.level - 1) * 2;
    let maxHp = base.hp + (player.level - 1) * 20;
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
            if (!soul || !soul.effect) return;
            if (soul.effect.type === 'passive') {
                atk += soul.effect.atkBonus || 0;
                def += soul.effect.defBonus || 0;
                maxHp += soul.effect.hpBonus || 0;
                crit += soul.effect.critBonus || 0;
            }
        });
    }

    player.atk = Math.max(1, atk);
    player.def = Math.max(0, def);
    player.maxHp = Math.max(10, maxHp);
    player.crit = Math.min(50, crit);

    if (player.hp > player.maxHp) player.hp = player.maxHp;

    return player;
}

function updateBuffs(player) {
    if (!player.buffs) player.buffs = [];
    player.buffs = player.buffs.filter(buff => {
        buff.remainingTurns--;
        return buff.remainingTurns > 0;
    });
    return player;
}

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats,
    updateBuffs,
    getAllPlayers,
    connectToMongo,
    ensurePlayerState,
    getPlayerCollection
};