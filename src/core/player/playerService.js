const Player = require('./PlayerModel');
const mongoose = require('mongoose');

let isConnected = false;

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
    player.lastActive = new Date();
    await player.save();
    // Converte para objeto plano para evitar problemas com métodos do Mongoose
    return player.toObject();
}

async function savePlayer(id, playerData) {
    await connectToMongo();
    const { _id, ...updateData } = playerData;
    updateData.updatedAt = new Date();
    const result = await Player.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true, upsert: true }
    );
    return result.toObject();
}

async function getAllPlayers() {
    await connectToMongo();
    const players = await Player.find({});
    const cache = {};
    players.forEach(p => { cache[p.id] = p.toObject(); });
    return cache;
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

function ensurePlayerState(player) { return player; }

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats,
    updateBuffs,
    getAllPlayers,
    connectToMongo,
    ensurePlayerState
};