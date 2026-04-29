function pct(part, total) {
    const numericPart = Number(part || 0);
    const numericTotal = Number(total || 0);

    if (numericTotal <= 0) return '0.0';
    return ((numericPart / numericTotal) * 100).toFixed(1);
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

function renderMetricsMessage(summary) {
    const c = summary.counters;
    const d = summary.derived;

    return `📊 *NOCTRA METRICS — ${summary.dateKey}*

*Aquisição / Atividade*
• Players criados: ${c.playersCreated}
• Menu loads: ${c.menuLoads}

*Combate*
• Iniciados: ${c.combatsStarted}
• Vitórias: ${c.combatsWon}
• Derrotas: ${c.combatsLost}
• Fugas: ${c.combatsFled}
• Win rate: ${d.winRate}%

*Dungeon*
• Iniciadas: ${c.dungeonsStarted}
• Concluídas: ${c.dungeonsCompleted}
• Abandonadas: ${c.dungeonsAbandoned}
• Salas limpas: ${c.dungeonRoomsCleared}
• Finish rate: ${d.dungeonFinishRate}%

*Drops / Economia*
• Itens dropados: ${c.itemsDropped}
• Souls dropadas: ${c.soulsDropped}
• Keys dropadas: ${c.keysDropped}
• Ouro entregue: ${c.goldAwarded}
• XP entregue: ${c.xpAwarded}

${renderRarityBlock(summary)}

*Uso*
• Consumíveis usados: ${c.consumablesUsed}

*Médias*
• Ouro por vitória: ${d.avgGoldPerCombat}
• XP por vitória: ${d.avgXpPerCombat}`;
}

module.exports = {
    pct,
    formatRarityLine,
    renderRarityBlock,
    renderMetricsMessage
};
