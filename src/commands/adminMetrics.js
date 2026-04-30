const {
    getTodayMetrics,
    getMetricsByDate,
    buildMetricsSummary
} = require('../core/metrics/metricsService');

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

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '0.0%';
    return `${n.toFixed(1)}%`;
}

function formatSignedNumber(value) {
    const n = Number(value || 0);
    if (n > 0) return `+${formatNumber(n)}`;
    return formatNumber(n);
}

function formatRarityLine(label, rarity = {}) {
    return `${label}: C ${formatNumber(rarity.comum)} | I ${formatNumber(rarity.incomum)} | R ${formatNumber(rarity.raro)} | E ${formatNumber(rarity.epico)} | L ${formatNumber(rarity.lendario)} | M ${formatNumber(rarity.mitico)}`;
}

function buildSignalLine(label, value, dangerLimit, warningLimit, direction = 'max') {
    const n = Number(value || 0);

    let status = '🟢';

    if (direction === 'max') {
        if (n >= dangerLimit) status = '🔴';
        else if (n >= warningLimit) status = '🟡';
    } else {
        if (n <= dangerLimit) status = '🔴';
        else if (n <= warningLimit) status = '🟡';
    }

    return `${status} ${label}: ${formatNumber(n)}`;
}

function buildMetricsMessage(summary) {
    const c = summary.counters;
    const d = summary.derived;
    const r = summary.rarity;
    const sr = summary.sourceRarity || {};

    const dungeonGold = Number(c.dungeonGoldAwarded || 0) + Number(c.dungeonEliteGoldAwarded || 0);
    const dungeonXp = Number(c.dungeonXpAwarded || 0) + Number(c.dungeonEliteXpAwarded || 0);
    const dungeonItems = Number(c.dungeonItemsDropped || 0) + Number(c.dungeonEliteItemsDropped || 0);
    const dungeonSouls = Number(c.dungeonSoulsDropped || 0) + Number(c.dungeonEliteSoulsDropped || 0);
    const dungeonKeys = Number(c.dungeonKeysDropped || 0) + Number(c.dungeonEliteKeysDropped || 0);

    return `📊 *NOCTRA METRICS V2 — ${summary.dateKey}*

━━━━━━━━━━━━━━━━━━━━━━
🧭 *Aquisição / Atividade*
• Players criados: ${formatNumber(c.playersCreated)}
• Menu loads: ${formatNumber(c.menuLoads)}

⚔️ *Combate*
• Iniciados: ${formatNumber(c.combatsStarted)}
• Vitórias: ${formatNumber(c.combatsWon)}
• Derrotas: ${formatNumber(c.combatsLost)}
• Fugas: ${formatNumber(c.combatsFled)}
• Win rate: ${formatPercent(d.winRate)}

🏰 *Dungeon*
• Iniciadas: ${formatNumber(c.dungeonsStarted)}
• Concluídas: ${formatNumber(c.dungeonsCompleted)}
• Abandonadas: ${formatNumber(c.dungeonsAbandoned)}
• Salas limpas: ${formatNumber(c.dungeonRoomsCleared)}
• Finish rate: ${formatPercent(d.dungeonFinishRate)}
• Abandon rate: ${formatPercent(d.dungeonAbandonRate)}

🌘 *Dungeon Elite*
• Iniciadas: ${formatNumber(c.dungeonEliteStarted)}
• Concluídas: ${formatNumber(c.dungeonEliteCompleted)}
• Abandonadas: ${formatNumber(c.dungeonEliteAbandoned)}
• Finish rate elite: ${formatPercent(d.dungeonEliteFinishRate)}

🗝️ *Chaves*
• Dropadas total: ${formatNumber(c.keysDropped)}
• Dropadas campo: ${formatNumber(c.fieldKeysDropped)}
• Dropadas dungeon: ${formatNumber(dungeonKeys)}
• Gastas total: ${formatNumber(c.keysSpent)}
• Net de chaves: ${formatSignedNumber(d.keyNet)}

🎁 *Drops*
• Itens total: ${formatNumber(c.itemsDropped)}
• Campo: ${formatNumber(c.fieldItemsDropped)}
• Dungeon: ${formatNumber(dungeonItems)}
• Recompensas finais: ${formatNumber(c.dungeonCompletionItems)}
• Souls total: ${formatNumber(c.soulsDropped)}
• Souls campo: ${formatNumber(c.fieldSoulsDropped)}
• Souls dungeon: ${formatNumber(dungeonSouls)}

💰 *Economia entregue*
• Ouro total: ${formatNumber(c.goldAwarded)}
• Ouro campo: ${formatNumber(c.fieldGoldAwarded)}
• Ouro dungeon: ${formatNumber(dungeonGold)}
• XP total: ${formatNumber(c.xpAwarded)}
• XP campo: ${formatNumber(c.fieldXpAwarded)}
• XP dungeon: ${formatNumber(dungeonXp)}
• Glórias entregues: ${formatNumber(c.gloriasAwarded)}

📈 *Médias e taxas*
• Ouro/vitória: ${formatNumber(d.avgGoldPerCombat)}
• XP/vitória: ${formatNumber(d.avgXpPerCombat)}
• Ouro/dungeon concluída: ${formatNumber(d.avgDungeonGoldPerCompletion)}
• XP/dungeon concluída: ${formatNumber(d.avgDungeonXpPerCompletion)}
• Item drop rate por vitória: ${formatPercent(d.itemDropRatePerWin)}
• Soul drop rate por vitória: ${formatPercent(d.soulDropRatePerWin)}
• Key drop rate por vitória: ${formatPercent(d.keyDropRatePerWin)}

💎 *Raridades — Total*
${formatRarityLine('Total', r)}

🌲 *Raridades — Campo*
${formatRarityLine('Campo', sr.field)}

🏰 *Raridades — Dungeon*
${formatRarityLine('Dungeon', sr.dungeon)}

🌘 *Raridades — Elite*
${formatRarityLine('Elite', sr.dungeonElite)}

🧪 *Uso / Monetização*
• Consumíveis usados: ${formatNumber(c.consumablesUsed)}
• Ouro gasto: ${formatNumber(c.goldSpent)}
• Nox gasto: ${formatNumber(c.noxSpent)}
• Glórias gastas: ${formatNumber(c.gloriasSpent)}
• Itens vendidos: ${formatNumber(c.itemsSold)}
• Ouro por vendas: ${formatNumber(c.goldFromSales)}
• Compras VIP: ${formatNumber(c.vipPurchases)}

🚨 *Sinais rápidos*
${buildSignalLine('Abandono dungeon', Number(d.dungeonAbandonRate || 0), 45, 25, 'max')}
${buildSignalLine('Net de chaves', Number(d.keyNet || 0), -10, -3, 'min')}
${buildSignalLine('Míticos totais', Number(r.mitico || 0), 5, 1, 'max')}`;
}

async function handleMetrics(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const parts = splitText(ctx.message?.text || '');
    const dateKey = parts[1];

    const doc = dateKey
        ? await getMetricsByDate(dateKey)
        : await getTodayMetrics();

    const summary = buildMetricsSummary(doc);

    return ctx.reply(buildMetricsMessage(summary), {
        parse_mode: 'Markdown'
    });
}

module.exports = {
    handleMetrics,
    buildMetricsMessage,
    formatRarityLine
};
