// src/core/player/PlayerModel.js
const mongoose = require('mongoose');

// Schema para os equipamentos do jogador
const equipmentSchema = new mongoose.Schema({
    weapon: { type: Object, default: null },
    armor: { type: Object, default: null },
    necklace: { type: Object, default: null },
    ring: { type: Object, default: null },
    boots: { type: Object, default: null }
}, { _id: false }); // O _id é desativado para este subdocumento

// Schema principal do jogador
const playerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // ID do Telegram
    name: { type: String, default: 'Viajante' },
    class: { type: String, enum: ['guerreiro', 'arqueiro', 'mago'], default: 'guerreiro' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
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
    lastActive: { type: Date, default: Date.now },
    lastDailyChest: { type: String, default: null },
}, { timestamps: true }); // Cria createdAt e updatedAt automaticamente

module.exports = mongoose.model('Player', playerSchema);