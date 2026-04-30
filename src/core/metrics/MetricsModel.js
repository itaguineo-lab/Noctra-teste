const mongoose = require('mongoose');

function buildDateKey(date = new Date()) {
    const safeDate = date instanceof Date ? date : new Date();
    const year = safeDate.getUTCFullYear();
    const month = String(safeDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const countersSchema = new mongoose.Schema(
    {
        playersCreated: { type: Number, default: 0 },
        menuLoads: { type: Number, default: 0 },

        combatsStarted: { type: Number, default: 0 },
        combatsWon: { type: Number, default: 0 },
        combatsLost: { type: Number, default: 0 },
        combatsFled: { type: Number, default: 0 },

        dungeonsStarted: { type: Number, default: 0 },
        dungeonsCompleted: { type: Number, default: 0 },
        dungeonsAbandoned: { type: Number, default: 0 },
        dungeonRoomsCleared: { type: Number, default: 0 },
        dungeonEliteStarted: { type: Number, default: 0 },
        dungeonEliteCompleted: { type: Number, default: 0 },
        dungeonEliteAbandoned: { type: Number, default: 0 },

        itemsDropped: { type: Number, default: 0 },
        fieldItemsDropped: { type: Number, default: 0 },
        dungeonItemsDropped: { type: Number, default: 0 },
        dungeonEliteItemsDropped: { type: Number, default: 0 },
        dungeonCompletionItems: { type: Number, default: 0 },
        dungeonCommonCompletionItems: { type: Number, default: 0 },
        dungeonEliteCompletionItems: { type: Number, default: 0 },

        itemRarityComum: { type: Number, default: 0 },
        itemRarityIncomum: { type: Number, default: 0 },
        itemRarityRaro: { type: Number, default: 0 },
        itemRarityEpico: { type: Number, default: 0 },
        itemRarityLendario: { type: Number, default: 0 },
        itemRarityMitico: { type: Number, default: 0 },
        itemRarityUnknown: { type: Number, default: 0 },

        fieldItemRarityComum: { type: Number, default: 0 },
        fieldItemRarityIncomum: { type: Number, default: 0 },
        fieldItemRarityRaro: { type: Number, default: 0 },
        fieldItemRarityEpico: { type: Number, default: 0 },
        fieldItemRarityLendario: { type: Number, default: 0 },
        fieldItemRarityMitico: { type: Number, default: 0 },
        fieldItemRarityUnknown: { type: Number, default: 0 },

        dungeonItemRarityComum: { type: Number, default: 0 },
        dungeonItemRarityIncomum: { type: Number, default: 0 },
        dungeonItemRarityRaro: { type: Number, default: 0 },
        dungeonItemRarityEpico: { type: Number, default: 0 },
        dungeonItemRarityLendario: { type: Number, default: 0 },
        dungeonItemRarityMitico: { type: Number, default: 0 },
        dungeonItemRarityUnknown: { type: Number, default: 0 },

        dungeonEliteItemRarityComum: { type: Number, default: 0 },
        dungeonEliteItemRarityIncomum: { type: Number, default: 0 },
        dungeonEliteItemRarityRaro: { type: Number, default: 0 },
        dungeonEliteItemRarityEpico: { type: Number, default: 0 },
        dungeonEliteItemRarityLendario: { type: Number, default: 0 },
        dungeonEliteItemRarityMitico: { type: Number, default: 0 },
        dungeonEliteItemRarityUnknown: { type: Number, default: 0 },

        soulsDropped: { type: Number, default: 0 },
        fieldSoulsDropped: { type: Number, default: 0 },
        dungeonSoulsDropped: { type: Number, default: 0 },
        dungeonEliteSoulsDropped: { type: Number, default: 0 },

        keysDropped: { type: Number, default: 0 },
        fieldKeysDropped: { type: Number, default: 0 },
        dungeonKeysDropped: { type: Number, default: 0 },
        dungeonEliteKeysDropped: { type: Number, default: 0 },
        keysSpent: { type: Number, default: 0 },
        dungeonKeysSpent: { type: Number, default: 0 },
        dungeonEliteKeysSpent: { type: Number, default: 0 },

        consumablesUsed: { type: Number, default: 0 },

        goldAwarded: { type: Number, default: 0 },
        fieldGoldAwarded: { type: Number, default: 0 },
        dungeonGoldAwarded: { type: Number, default: 0 },
        dungeonEliteGoldAwarded: { type: Number, default: 0 },

        xpAwarded: { type: Number, default: 0 },
        fieldXpAwarded: { type: Number, default: 0 },
        dungeonXpAwarded: { type: Number, default: 0 },
        dungeonEliteXpAwarded: { type: Number, default: 0 },

        gloriasAwarded: { type: Number, default: 0 },
        dungeonGloriasAwarded: { type: Number, default: 0 },
        dungeonEliteGloriasAwarded: { type: Number, default: 0 },

        goldSpent: { type: Number, default: 0 },
        noxSpent: { type: Number, default: 0 },
        gloriasSpent: { type: Number, default: 0 },
        itemsSold: { type: Number, default: 0 },
        goldFromSales: { type: Number, default: 0 },
        vipPurchases: { type: Number, default: 0 }
    },
    { _id: false }
);

const MetricsSchema = new mongoose.Schema(
    {
        dateKey: {
            type: String,
            required: true,
            unique: true,
            default: buildDateKey,
            set: (value) => {
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
                    return value.trim();
                }
                return buildDateKey();
            }
        },
        counters: {
            type: countersSchema,
            default: () => ({})
        }
    },
    {
        timestamps: true,
        collection: 'metrics_daily'
    }
);

MetricsSchema.pre('validate', function metricsPreValidate(next) {
    if (!this.dateKey || typeof this.dateKey !== 'string') {
        this.dateKey = buildDateKey();
    }

    if (!this.counters || typeof this.counters !== 'object') {
        this.counters = {};
    }

    next();
});

module.exports =
    mongoose.models.MetricsDaily ||
    mongoose.model('MetricsDaily', MetricsSchema);
