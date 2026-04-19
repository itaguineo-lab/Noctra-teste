const mongoose = require('mongoose');

function buildDateKey(date = new Date()) {
    const safeDate = date instanceof Date ? date : new Date();
    const year = safeDate.getUTCFullYear();
    const month = String(safeDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const MetricsSchema = new mongoose.Schema(
    {
        dateKey: {
            type: String,
            required: true,
            unique: true,
            default: () => buildDateKey()
        },

        counters: {
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
        }
    },
    {
        timestamps: true,
        collection: 'metrics_daily'
    }
);

module.exports =
    mongoose.models.MetricsDaily ||
    mongoose.model('MetricsDaily', MetricsSchema);