const { renderDungeonRewardAudit } = require('../core/dungeon/dungeonRewardAudit');

function pct(part, total) {
    const numericPart = Number(part || 0);
    const numericTotal = Number(total || 0);

    if (numericTotal <= 0) return '0.0';
    return ((numericPart / numericTotal) * 100).toFixed(1);
}

function avg(part, total, decimals = 1) {
    const numericPart = Number(part || 0);
    const numericTotal = Number(total || 0);

    if (numericTotal <= 0) return Number(0).toFixed(decimals);
    return (numericPart / numericTotal).toFixed(decimals);
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function formatDecimal(value, decimals = 1) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return Number(0).toFixed(decimals);
    return n.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
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

function formatRarityLine(label, value, total) {
    const count = Number(value || 0);
    return `• ${label}: ${count} (${pct(count, total)}%)`;
}

function renderRarityBlock(summary = {}) {
    const rarity = summary.rarity || {};
    const total = Number(rarity.totalTracked || rarity.totalKnown || 0);

    return `*Raridade dos Itens*\n` +
        `${formatRarityLine('Comum', rarity.comum, total)}\n` +
        `${formatRarityLine('Incomum', rarity.incomum, total)}\n` +
        `${formatRarityLine('Raro', rarity.raro, total)}\n` +
        `${formatRarityLine('Épico', rarity.epico, total)}\n` +
        `${formatRarityLine('Lendário', rarity.lendario, total)}\n` +
        `${formatRarityLine('Mítico', rarity.mitico, total)}\n` +
        `${formatRarityLine('Unknown', rarity.unknown, total)}`;
}

function renderCompactRarityLine(label, rarity = {}) {
    return `${label}: C ${formatNumber(rarity.comum)} | I ${formatNumber(rarity.incomum)} | R ${formatNumber(rarity.raro)} | E ${formatNumber(rarity.epico)} | L ${formatNumber(rarity.lendario)} | M ${formatNumber(rarity.mitico)}`;
}

function renderMetricsMessage(summary) {
    const c = summary.counters;
    const d = summary.derived;
    const sr = summary.sourceRarity || {};

    const commonDungeonCompleted = Number(d.commonDungeonCompleted || 0);
    const dungeonGold = Number(c.dungeonGoldAwarded || 0) + Number(c.dungeonEliteGoldAwarded || 0);
    const dungeonXp = Number(c.dungeonXpAwarded || 0) + Number(c.dungeonEliteXpAwarded || 0);
    const dungeonItems = Number(c.dungeonItemsDropped || 0) + Number(c.dungeonEliteItemsDropped || 0);
    const dungeonSouls = Number(c.dungeonSoulsDropped || 0) + Number(c.dungeonEliteSoulsDropped || 0);
    const dungeonKeys = Number(c.dungeonKeysDropped || 0) + Number(c.dungeonEliteKeysDropped || 0);

    const fieldItemDropRate = pct(c.fieldItemsDropped, c.combatsWon);
    const fieldSoulDropRate = pct(c.fieldSoulsDropped, c.combatsWon);
    const fieldKeyDropRate = pct(c.fieldKeysDropped, c.combatsWon);

    const commonDungeonItemsPerCompletion = avg(c.dungeonItemsDropped, commonDungeonCompleted);
    const commonDungeonSoulRate = pct(c.dungeonSoulsDropped, commonDungeonCompleted);
    const commonDungeonKeyRate = pct(c.dungeonKeysDropped, commonDungeonCompleted);

    const eliteDungeonItemsPerCompletion = avg(c.dungeonEliteItemsDropped, c.dungeonEliteCompleted);
    const eliteDungeonSoulRate = pct(c.dungeonEliteSoulsDropped, c.dungeonEliteCompleted);
    const eliteDungeonKeyRate = pct(c.dungeonEliteKeysDropped, c.dungeonEliteCompleted);

    return `📊 *NOCTRA METRICS — ${summary.dateKey}*

━━━━━━━━━━━━━━━━━━━━━━
🧭 *Aquisição / Atividade*
• Players criados: ${formatNumber(c.playersCreated)}
• Menu loads: ${formatNumber(c.menuLoads)}

⚔️ *Combate de Campo*
• Iniciados: ${formatNumber(c.combatsStarted)}
• Vitórias: ${formatNumber(c.combatsWon)}
• Derrotas: ${formatNumber(c.combatsLost)}
• Fugas: ${formatNumber(c.combatsFled)}
• Win rate: ${formatPercent(d.winRate)}

🏰 *Dungeon*
• Iniciadas: ${formatNumber(c.dungeonsStarted)}
• Concluídas: ${formatNumber(c.dungeonsCompleted)}
• Comuns concluídas: ${formatNumber(commonDungeonCompleted)}
• Elite concluídas: ${formatNumber(c.dungeonEliteCompleted)}
• Abandonadas: ${formatNumber(c.dungeonsAbandoned)}
• Salas limpas: ${formatNumber(c.dungeonRoomsCleared)}
• Finish rate: ${formatPercent(d.dungeonFinishRate)}
• Abandon rate: ${formatPercent(d.dungeonAbandonRate)}

🧩 *Composição das Salas*
• Ameaça real: ${formatNumber(d.dungeonCombatLikeRoomsCleared)} (${d.dungeonCombatRoomRate}%)
• Eventos: ${formatNumber(d.dungeonEventRoomsCleared)} (${d.dungeonEventRoomRate}%)
• Combate: ${formatNumber(c.dungeonCombatRoomsCleared)}
• Elite: ${formatNumber(c.dungeonEliteRoomsCleared)}
• Boss: ${formatNumber(c.dungeonBossRoomsCleared)}
• Tesouro: ${formatNumber(c.dungeonTreasureRoomsCleared)}
• Cura: ${formatNumber(c.dungeonHealRoomsCleared)}
• Maldição: ${formatNumber(c.dungeonCurseRoomsCleared)}
• Santuário: ${formatNumber(c.dungeonShrineRoomsCleared)}
• Outros: ${formatNumber(c.dungeonOtherRoomsCleared)}

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
• Finais comuns: ${formatNumber(c.dungeonCommonCompletionItems)}
• Finais elite: ${formatNumber(c.dungeonEliteCompletionItems)}
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

📈 *Médias — Campo*
• Ouro/vitória campo: ${formatNumber(d.avgFieldGoldPerWin)}
• XP/vitória campo: ${formatNumber(d.avgFieldXpPerWin)}
• Itens/vitória campo: ${fieldItemDropRate}%
• Souls/vitória campo: ${fieldSoulDropRate}%
• Chaves/vitória campo: ${fieldKeyDropRate}%

🏰 *Médias — Dungeon Comum*
• Ouro/dungeon comum: ${formatNumber(d.avgCommonDungeonGoldPerCompletion)}
• XP/dungeon comum: ${formatNumber(d.avgCommonDungeonXpPerCompletion)}
• Itens/dungeon comum: ${commonDungeonItemsPerCompletion}
• Souls/dungeon comum: ${commonDungeonSoulRate}%
• Chaves/dungeon comum: ${commonDungeonKeyRate}%
• Item final dungeon comum: ${formatPercent(d.commonCompletionItemRate)}

🔥 *Médias — Dungeon Elite*
• Ouro/dungeon elite: ${formatNumber(d.avgEliteDungeonGoldPerCompletion)}
• XP/dungeon elite: ${formatNumber(d.avgEliteDungeonXpPerCompletion)}
• Itens/dungeon elite: ${eliteDungeonItemsPerCompletion}
• Souls/dungeon elite: ${eliteDungeonSoulRate}%
• Chaves/dungeon elite: ${eliteDungeonKeyRate}%
• Item final dungeon elite: ${formatPercent(d.eliteCompletionItemRate)}

${renderRarityBlock(summary)}

🌲 *Raridades por fonte*
${renderCompactRarityLine('Campo', sr.field)}
${renderCompactRarityLine('Dungeon', sr.dungeon)}
${renderCompactRarityLine('Elite', sr.dungeonElite)}

${renderDungeonRewardAudit(summary)}

🧪 *Uso / Monetização*
• Consumíveis usados: ${formatNumber(c.consumablesUsed)}
• Ouro gasto: ${formatNumber(c.goldSpent)}
• Nox gasto: ${formatNumber(c.noxSpent)}
• Glórias gastas: ${formatNumber(c.gloriasSpent)}
• Itens vendidos: ${formatNumber(c.itemsSold)}
• Ouro por vendas: ${formatNumber(c.goldFromSales)}
• Compras VIP: ${formatNumber(c.vipPurchases)}`;
}

module.exports = {
    pct,
    avg,
    formatNumber,
    formatDecimal,
    formatPercent,
    formatSignedNumber,
    formatRarityLine,
    renderRarityBlock,
    renderCompactRarityLine,
    renderMetricsMessage
};
