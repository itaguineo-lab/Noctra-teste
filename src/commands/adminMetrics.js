const {
    getTodayMetrics,
    getMetricsByDate,
    buildMetricsSummary,
    getDateKey,
    sanitizeDateKey
} = require('../core/metrics/metricsService');

const {
    resetMetricsForDate
} = require('../core/metrics/metricsAdminService');

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

async function handleMetricsReset(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const parts = splitText(ctx.message?.text || '');
    const rawDateKey = parts[1] || getDateKey();
    const dateKey = sanitizeDateKey(rawDateKey);

    const result = await resetMetricsForDate(dateKey);

    if (!result.reset) {
        return ctx.reply(
            `⚠️ *RESET DE MÉTRICAS NÃO PERSISTIDO*\n\n` +
            `📅 Data: \`${result.dateKey}\`\n` +
            `📦 Estado: ${result.persistence}\n` +
            `${result.error ? `\nErro: ${result.error}` : ''}\n\n` +
            `Se estiver em ambiente de teste ou sem MongoDB conectado, isso é esperado.`,
            { parse_mode: 'Markdown' }
        );
    }

    return ctx.reply(
        `🧹 *MÉTRICAS RESETADAS*\n\n` +
        `📅 Data: \`${result.dateKey}\`\n` +
        `✅ Contadores zerados para teste limpo.\n\n` +
        `Agora rode o protocolo de teste e depois use:\n` +
        `\`/metrics ${result.dateKey}\``,
        { parse_mode: 'Markdown' }
    );
}

module.exports = {
    handleMetrics,
    handleMetricsReset,
    buildMetricsMessage: renderMetricsMessage,
    formatRarityLine
};
