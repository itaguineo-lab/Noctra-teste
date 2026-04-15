const mongoose = require('mongoose');

// Schema para os equipamentos do jogador (subdocumento)
const equipmentSchema = new mongoose.Schema({
    weapon: { type: Object, default: null },
    shield: { type: Object, default: null },
    armor: { type: Object, default: null },
    necklace: { type: Object, default: null },
    ring: { type: Object, default: null },
    boots: { type: Object, default: null }
}, { _id: false });

// Schema principal do jogador
const playerSchema = new mongoose.Schema({
    // Identificação
    id: { type: String, required: true, unique: true },
    name: { type: String, default: 'Viajante' },
    
    // Progressão
    class: { type: String, enum: ['guerreiro', 'arqueiro', 'mago'], default: 'guerreiro' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    
    // Estatísticas de combate (PERSISTIDAS)
    hp: { type: Number, default: 120 },
    maxHp: { type: Number, default: 120 },
    atk: { type: Number, default: 12 },
    def: { type: Number, default: 10 },
    crit: { type: Number, default: 5 },
    
    // Economia
    gold: { type: Number, default: 100 },
    nox: { type: Number, default: 0 },
    glorias: { type: Number, default: 0 },
    keys: { type: Number, default: 0 },
    
    // Energia
    energy: { type: Number, default: 20 },
    maxEnergy: { type: Number, default: 20 },
    lastEnergyUpdate: { type: Date, default: Date.now },
    
    // Inventário e equipamentos
    inventory: { type: Array, default: [] },
    equipment: { type: equipmentSchema, default: () => ({}) },
    consumables: {
        potionHp: { type: Number, default: 0 },
        potionEnergy: { type: Number, default: 0 },
        tonicStrength: { type: Number, default: 0 },
        tonicDefense: { type: Number, default: 0 }
    },
    
    // Almas
    soulsInventory: { type: Array, default: [] },
    soulsEquipped: { type: Array, default: [null, null] },
    
    // Buffs temporários
    buffs: { type: Array, default: [] },
    
    // Estatísticas gerais
    totalKills: { type: Number, default: 0 },
    achievements: { type: Object, default: {} },
    
    // Mapa
    currentMap: { type: String, default: 'clareira_sombria' },
    
    // VIP
    vip: { type: Boolean, default: false },
    vipExpires: { type: Date, default: null },
    bonusInventory: { type: Number, default: 0 },
    maxInventory: { type: Number, default: 20 },
    
    // Flags
    renamed: { type: Boolean, default: false },
    classChanged: { type: Boolean, default: false },
    
    // Masmorra
    dungeonProgress: { type: Object, default: null },
    lastDungeonRun: { type: Number, default: 0 },
    soulPityCounter: { type: Number, default: 0 },
    cosmetics: { type: Array, default: [] },
    activeCosmetics: {
        title: { type: String, default: null },
        aura: { type: String, default: null },
        badge: { type: String, default: null }
    },
    
    // Baú diário
    lastDailyChest: { type: String, default: null },
    
    // Admin / Moderação
    banned: { type: Boolean, default: false },
    
    // Datas
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
