const mongoose = require('mongoose');

const MetricsSchema = new mongoose.Schema(
    {
        dateKey: { type: String, required: true, index: true },
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
            xpAwarded: { type: Number, default: 0 }
        }
    },
    {
        timestamps: true,
        collection: 'metrics_daily'
    }
);

MetricsSchema.index({ dateKey: 1 }, { unique: true });

module.exports = mongoose.models.MetricsDaily || mongoose.model('MetricsDaily', MetricsSchema);