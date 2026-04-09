const Player = require('./PlayerModel');
const mongoose = require('mongoose');

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

    const validSlots = [
        'weapon',
        'armor',
        'necklace',
        'ring',
        'boots'
    ];

    for (const validSlot of validSlots) {
        if (
            String(originalSlot).startsWith(validSlot) &&
            originalSlot !== validSlot
        ) {
            item.slot = validSlot;
            break;
        }
    }

    return item;
}

/*
=================================
STATS
=================================
*/

function recalculateStats(player) {
    const BASE_STATS = {
        guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
        mago: { atk: 18, def: 4, hp: 80, crit: 8 },
        arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
    };

    const previousMaxHp = Number(player.maxHp) || 0;
    const previousHp =
        player.hp === undefined || player.hp === null
            ? null
            : Number(player.hp);

    const hpRatio =
        previousHp !== null && previousMaxHp > 0
            ? previousHp / previousMaxHp
            : null;

    const base =
        BASE_STATS[player.class] ||
        BASE_STATS.guerreiro;

    let atk = base.atk + ((player.level || 1) - 1) * 3;
    let def = base.def + ((player.level || 1) - 1) * 2;
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

    if (hpRatio === null) {
        player.hp = player.maxHp;
    } else {
        player.hp = Math.max(
            1,
            Math.min(
                Math.round(player.maxHp * hpRatio),
                player.maxHp
            )
        );
    }

    return player;
}

/*
=================================
ESTADO PADRÃO
=================================
*/

function ensurePlayerState(player) {
    if (!player) return {};

    if (!player.id) {
        throw new Error('Player sem ID');
    }

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

    const slots = ['weapon', 'armor', 'necklace', 'ring', 'boots'];

    slots.forEach(slot => {
        if (!(slot in player.equipment)) {
            player.equipment[slot] = null;
        }

        if (player.equipment[slot]) {
            player.equipment[slot] = migrateItemSlot(
                player.equipment[slot]
            );
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

    player.cosmetics ??= [];
    player.lastDailyChest ??= null;

    player.renamed ??= false;
    player.classChanged ??= false;

    player.createdAt ??= Date.now();
    player.updatedAt ??= Date.now();

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

    if (!mongoUri) {
        throw new Error('MONGODB_URI não definida');
    }

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

async function getPlayer(id, name = 'Viajante') {
    await connectToMongo();

    let player = await Player.findOne({ id });

    if (!player) {
        player = new Player({ id, name });
        await player.save();
    }

    const playerObj = player.toObject();

    ensurePlayerState(playerObj);
    recalculateStats(playerObj);

    return playerObj;
}

/*
=================================
SAVE PLAYER
=================================
*/

async function savePlayer(id, playerData) {
    await connectToMongo();

    const { _id, ...updateData } = playerData;

    ensurePlayerState(updateData);
    recalculateStats(updateData);

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
BUFFS
=================================
*/

function updateBuffs(player) {
    player.buffs ??= [];

    player.buffs = player.buffs.filter(buff => {
        buff.remainingTurns--;
        return buff.remainingTurns > 0;
    });

    return player;
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

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats,
    updateBuffs,
    connectToMongo,
    ensurePlayerState,
    getPlayerCollection
};
