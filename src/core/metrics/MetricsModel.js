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

        itemsDropped: { type: Number, default: 0 },
        itemRarityComum: { type: Number, default: 0 },
        itemRarityIncomum: { type: Number, default: 0 },
        itemRarityRaro: { type: Number, default: 0 },
        itemRarityEpico: { type: Number, default: 0 },
        itemRarityLendario: { type: Number, default: 0 },
        itemRarityMitico: { type: Number, default: 0 },
        itemRarityUnknown: { type: Number, default: 0 },

        soulsDropped: { type: Number, default: 0 },
        keysDropped: { type: Number, default: 0 },

        consumablesUsed: { type: Number, default: 0 },

        goldAwarded: { type: Number, default: 0 },
        xpAwarded: { type: Number, default: 0 },

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