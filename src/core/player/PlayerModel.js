const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
    {
        id: { type: String, default: null },
        instanceId: { type: String, default: null },
        legacyBase: { type: String, default: null },

        name: { type: String, required: true },
        slot: { type: String, default: null },
        category: { type: String, default: null },
        uiCategory: { type: String, default: null },
        displayCategory: { type: String, default: null },
        emoji: { type: String, default: null },
        icon: { type: String, default: null },

        rarity: { type: String, default: 'Comum' },
        level: { type: Number, default: 1 },

        atk: { type: Number, default: 0 },
        def: { type: Number, default: 0 },
        hp: { type: Number, default: 0 },
        crit: { type: Number, default: 0 },
        power: { type: Number, default: 0 },

        powerTier: { type: String, default: null },
        sourceTier: { type: String, default: null },

        classRestriction: { type: String, default: null },
        allowedClasses: { type: [String], default: [] },

        weaponStyle: { type: String, default: null },
        offhandMode: { type: String, default: null },
        requiredOffhandType: { type: String, default: null },
        offhandType: { type: String, default: null },

        price: { type: Number, default: 0 },
        __equipped: { type: Boolean, default: false }
    },
    { _id: false }
);

const soulSchema = new mongoose.Schema(
    {
        id: { type: String, default: null },
        instanceId: { type: String, default: null },
        bossId: { type: String, default: null },
        name: { type: String, required: true },
        rarity: { type: String, default: 'Comum' },
        tier: { type: Number, default: 1 },
        emoji: { type: String, default: null },
        minLevel: { type: Number, default: 1 },
        shardValue: { type: Number, default: 5 },
        classRestriction: { type: String, default: null },

        level: { type: Number, default: 1 },
        exp: { type: Number, default: 0 },
        shards: { type: Number, default: 0 },
        awakenLevel: { type: Number, default: 0 },

        /*
        IMPORTANTE:
        effect precisa ser Mixed para preservar todos os tipos reais de alma:
        - damage: multiplier, freezeChance
        - heal: multiplier
        - lifesteal: multiplier, healPercent
        - passive: atkBonus, defBonus, hpBonus, critBonus

        O schema antigo declarava apenas bônus passivos e podia remover
        effect.type/multiplier ao salvar no MongoDB. Isso quebrava almas
        ativas e passivas depois de recarregar o jogador.
        */
        effect: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
    },
    { _id: false }
);

const buffSchema = new mongoose.Schema(
    {
        type: { type: String, required: true },
        atk: { type: Number, default: 0 },
        def: { type: Number, default: 0 },
        hp: { type: Number, default: 0 },
        crit: { type: Number, default: 0 },
        expiresAt: { type: Number, default: null }
    },
    { _id: false }
);

const cosmeticSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true }
    },
    { _id: false }
);

const timedChestSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        tier: { type: String, required: true },
        createdAt: { type: Number, default: Date.now },
        readyAt: { type: Number, required: true }
    },
    { _id: false }
);

const missionSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        title: { type: String, required: true },
        type: { type: String, required: true },
        target: { type: Number, required: true },
        progress: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
        reward: {
            gold: { type: Number, default: 0 },
            xp: { type: Number, default: 0 },
            glorias: { type: Number, default: 0 },
            keys: { type: Number, default: 0 }
        }
    },
    { _id: false }
);

const playerSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true, index: true },

        name: { type: String, required: true },
        class: { type: String, default: 'guerreiro' },

        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },

        gold: { type: Number, default: 100 },
        nox: { type: Number, default: 0 },
        glorias: { type: Number, default: 0 },
        keys: { type: Number, default: 0 },

        hp: { type: Number, default: 120 },
        maxHp: { type: Number, default: 120 },
        atk: { type: Number, default: 12 },
        def: { type: Number, default: 10 },
        crit: { type: Number, default: 5 },

        energy: { type: Number, default: 20 },
        maxEnergy: { type: Number, default: 20 },
        lastEnergyUpdate: { type: Date, default: Date.now },

        vip: { type: Boolean, default: false },
        vipExpires: { type: Date, default: null },

        bonusInventory: { type: Number, default: 0 },
        maxInventory: { type: Number, default: 20 },

        inventory: { type: [itemSchema], default: [] },

        equipment: {
            weapon: { type: itemSchema, default: null },
            shield: { type: itemSchema, default: null },
            armor: { type: itemSchema, default: null },
            necklace: { type: itemSchema, default: null },
            ring: { type: itemSchema, default: null },
            boots: { type: itemSchema, default: null }
        },

        consumables: {
            potionHp: { type: Number, default: 0 },
            potionEnergy: { type: Number, default: 0 },
            tonicStrength: { type: Number, default: 0 },
            tonicDefense: { type: Number, default: 0 }
        },

        buffs: { type: [buffSchema], default: [] },

        soulsInventory: { type: [soulSchema], default: [] },

        /*
        IMPORTANTE:
        não usar [null, null] em array de subdocumentos.
        Isso quebra com setDefaultsOnInsert / upsert.
        */
        soulsEquipped: {
            type: mongoose.Schema.Types.Mixed,
            default: () => [null, null]
        },

        cosmetics: { type: [cosmeticSchema], default: [] },
        activeCosmetics: {
            title: { type: String, default: null },
            aura: { type: String, default: null },
            badge: { type: String, default: null }
        },

        currentMap: { type: String, default: 'clareira_sombria' },
        dungeonProgress: { type: mongoose.Schema.Types.Mixed, default: null },
        lastDungeonRun: { type: Number, default: 0 },
        soulPityCounter: { type: Number, default: 0 },

        arena: { type: mongoose.Schema.Types.Mixed, default: null },

        totalKills: { type: Number, default: 0 },
        achievements: { type: mongoose.Schema.Types.Mixed, default: {} },

        lastDailyChest: { type: String, default: null },
        dailyStreak: { type: Number, default: 0 },
        timedChests: { type: [timedChestSchema], default: [] },

        dailyMissions: {
            dateKey: { type: String, default: null },
            missions: { type: [missionSchema], default: [] },
            claimedAll: { type: Boolean, default: false }
        },

        renamed: { type: Boolean, default: false },
        classChanged: { type: Boolean, default: false },
        banned: { type: Boolean, default: false },

        activeFight: { type: mongoose.Schema.Types.Mixed, default: null },
        activeArenaBattle: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    {
        timestamps: true,
        collection: 'players'
    }
);

module.exports =
    mongoose.models.Player ||
    mongoose.model('Player', playerSchema);
