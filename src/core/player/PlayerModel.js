const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    weapon: { type: Object, default: null },
    shield: { type: Object, default: null },
    armor: { type: Object, default: null },
    necklace: { type: Object, default: null },
    ring: { type: Object, default: null },
    boots: { type: Object, default: null }
}, { _id: false });

const activeFightSchema = new mongoose.Schema({
    mode: { type: String, default: 'hunt' },
    createdAt: { type: Number, default: null },
    expiresAt: { type: Number, default: null },
    battleMessageId: { type: Number, default: null },
    isPhoto: { type: Boolean, default: false },
    payload: { type: Object, default: null }
}, { _id: false });

const activeArenaBattleSchema = new mongoose.Schema({
    mode: { type: String, default: 'arena' },
    createdAt: { type: Number, default: null },
    expiresAt: { type: Number, default: null },
    messageId: { type: Number, default: null },
    payload: { type: Object, default: null }
}, { _id: false });

const missionEntrySchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    target: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    reward: { type: Object, default: {} }
}, { _id: false });

const dailyMissionsSchema = new mongoose.Schema({
    dateKey: { type: String, default: null },
    missions: { type: [missionEntrySchema], default: [] },
    claimedAll: { type: Boolean, default: false }
}, { _id: false });

const playerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, default: 'Viajante' },

    class: { type: String, enum: ['guerreiro', 'arqueiro', 'mago'], default: 'guerreiro' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },

    hp: { type: Number, default: 120 },
    maxHp: { type: Number, default: 120 },
    atk: { type: Number, default: 12 },
    def: { type: Number, default: 10 },
    crit: { type: Number, default: 5 },

    gold: { type: Number, default: 100 },
    nox: { type: Number, default: 0 },
    glorias: { type: Number, default: 0 },
    keys: { type: Number, default: 0 },

    energy: { type: Number, default: 20 },
    maxEnergy: { type: Number, default: 20 },
    lastEnergyUpdate: { type: Date, default: Date.now },

    inventory: { type: Array, default: [] },
    equipment: { type: equipmentSchema, default: () => ({}) },
    consumables: {
        potionHp: { type: Number, default: 0 },
        potionEnergy: { type: Number, default: 0 },
        tonicStrength: { type: Number, default: 0 },
        tonicDefense: { type: Number, default: 0 }
    },

    soulsInventory: { type: Array, default: [] },
    soulsEquipped: { type: Array, default: [null, null] },

    buffs: { type: Array, default: [] },

    totalKills: { type: Number, default: 0 },
    achievements: { type: Object, default: {} },

    currentMap: { type: String, default: 'clareira_sombria' },

    vip: { type: Boolean, default: false },
    vipExpires: { type: Date, default: null },
    bonusInventory: { type: Number, default: 0 },
    maxInventory: { type: Number, default: 20 },

    renamed: { type: Boolean, default: false },
    classChanged: { type: Boolean, default: false },

    dungeonProgress: { type: Object, default: null },
    lastDungeonRun: { type: Number, default: 0 },
    soulPityCounter: { type: Number, default: 0 },

    cosmetics: { type: Array, default: [] },
    activeCosmetics: {
        title: { type: String, default: null },
        aura: { type: String, default: null },
        badge: { type: String, default: null }
    },

    arena: { type: Object, default: null },

    dailyMissions: { type: dailyMissionsSchema, default: () => ({}) },
    lastDailyChest: { type: String, default: null },
    dailyStreak: { type: Number, default: 0 },

    banned: { type: Boolean, default: false },

    activeFight: { type: activeFightSchema, default: null },
    activeArenaBattle: { type: activeArenaBattleSchema, default: null },

    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);