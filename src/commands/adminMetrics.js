const {
    getTodayMetrics,
    getMetricsByDate,
    buildMetricsSummary
} = require('../core/metrics/metricsService');

const {
    renderMetricsMessage,
    formatRarityLine
} = require('../renderers/adminMetricsRenderer');

function getAdminIds() {
    return String(process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
}

function isAdmin(ctx) {
    return getAdminIds().includes(String(ctx.from?.id || ''));
}

async function requireAdmin(ctx) {
    if (!isAdmin(ctx)) {
        await ctx.reply('⛔ Comando restrito ao administrador.');
        return false;
    }

    return true;
}

function splitText(text = '') {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
}

async function handleMetrics(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const parts = splitText(ctx.message?.text || '');
    const dateKey = parts[1];

    const doc = dateKey
        ? await getMetricsByDate(dateKey)
        : await getTodayMetrics();

    const summary = buildMetricsSummary(doc);

    return ctx.reply(renderMetricsMessage(summary), {
        parse_mode: 'Markdown'
    });
}

module.exports = {
    handleMetrics,
    buildMetricsMessage: renderMetricsMessage,
    formatRarityLine
};
