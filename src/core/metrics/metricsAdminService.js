const MetricsDaily = require('./MetricsModel');

const {
    buildDefaultCounters,
    sanitizeDateKey,
    shouldPersistMetrics
} = require('./metricsService');

function buildMetricsResetPreview(dateKeyInput) {
    const dateKey = sanitizeDateKey(dateKeyInput);

    return {
        dateKey,
        counters: buildDefaultCounters()
    };
}

async function resetMetricsForDate(dateKeyInput) {
    const preview = buildMetricsResetPreview(dateKeyInput);

    if (!shouldPersistMetrics()) {
        return {
            ...preview,
            reset: false,
            persistence: 'skipped'
        };
    }

    try {
        const doc = await MetricsDaily.findOneAndUpdate(
            { dateKey: preview.dateKey },
            {
                $set: {
                    dateKey: preview.dateKey,
                    counters: preview.counters
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: false
            }
        );

        return {
            dateKey: preview.dateKey,
            counters: doc?.counters || preview.counters,
            reset: true,
            persistence: 'saved'
        };
    } catch (error) {
        console.error('⚠️ resetMetricsForDate falhou:', error);
        return {
            ...preview,
            reset: false,
            persistence: 'error',
            error: error?.message || 'Erro desconhecido'
        };
    }
}

module.exports = {
    buildMetricsResetPreview,
    resetMetricsForDate
};
