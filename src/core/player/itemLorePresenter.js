const { getRarityEmoji } = require('../../data/balance');

const CLASS_LABELS = {
    guerreiro: 'Guerreiro',
    arqueiro: 'Arqueiro',
    mago: 'Mago'
};

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function getClassLabel(className = '') {
    return CLASS_LABELS[String(className || '').toLowerCase()] || className || 'Livre';
}

function getAllowedClassesLabel(item = {}) {
    const allowed = Array.isArray(item.allowedClasses) ? item.allowedClasses : [];
    if (!allowed.length) return 'Livre';
    return allowed.map(getClassLabel).join(', ');
}

function calcItemPower(item = {}) {
    if (item.power !== undefined && item.power !== null && Number.isFinite(Number(item.power))) {
        return Math.max(1, Number(item.power));
    }

    const atk = safeNumber(item.atk);
    const def = safeNumber(item.def);
    const hp = safeNumber(item.hp);
    const crit = safeNumber(item.crit);

    return Math.max(1, Math.round((atk * 2) + (def * 1.5) + (hp * 0.5) + (crit * 3)));
}

function buildVerticalStats(item = {}) {
    const lines = [];

    if (safeNumber(item.atk) > 0) lines.push(`⚔️ ATK +${safeNumber(item.atk)}`);
    if (safeNumber(item.def) > 0) lines.push(`🛡️ DEF +${safeNumber(item.def)}`);
    if (safeNumber(item.hp) > 0) lines.push(`❤️ HP +${safeNumber(item.hp)}`);
    if (safeNumber(item.crit) > 0) lines.push(`💥 CRIT +${safeNumber(item.crit)}%`);

    return lines.length ? lines.join('\n') : 'Sem bônus relevantes.';
}

function buildLoreBlock(item = {}) {
    const lines = [];

    if (item.originMap || item.setName || item.dropSource || item.traitLabel || item.qualityLabel) {
        lines.push('*Identidade*');
        if (item.originMap) lines.push(`🗺️ Origem: ${escapeMarkdown(item.originMap)}`);
        if (item.setName) lines.push(`🧩 Conjunto: ${escapeMarkdown(item.setName)}`);
        if (item.dropSource) lines.push(`🎯 Fonte: ${escapeMarkdown(item.dropSource)}`);
        if (item.traitLabel) lines.push(`🧬 Traço: ${escapeMarkdown(item.traitLabel)}`);
        if (item.qualityLabel) lines.push(`✨ Qualidade: ${escapeMarkdown(item.qualityLabel)}`);
    }

    if (item.flavor) {
        if (lines.length) lines.push('');
        lines.push('*Descrição*');
        lines.push(`_${escapeMarkdown(item.flavor)}_`);
    }

    if (Array.isArray(item.tags) && item.tags.length) {
        const visibleTags = item.tags
            .slice(0, 4)
            .map(tag => `#${String(tag || '').replace(/\s+/g, '_')}`)
            .join(' ');

        if (visibleTags) {
            if (lines.length) lines.push('');
            lines.push(`🏷️ ${escapeMarkdown(visibleTags)}`);
        }
    }

    return lines.length ? lines.join('\n') : null;
}

function formatDelta(value, { isPercent = false } = {}) {
    const n = safeNumber(value);
    if (n > 0) return `+${n}${isPercent ? '%' : ''}`;
    if (n < 0) return `${n}${isPercent ? '%' : ''}`;
    return isPercent ? '0%' : '0';
}

function buildAttributeComparisonBlock(item = {}, equippedItem = null, { isEquipped = false } = {}) {
    if (isEquipped) return 'Este item já está equipado.';
    if (!equippedItem) return 'Slot vazio. Este item será equipado direto.';

    const currentAtk = safeNumber(equippedItem.atk);
    const currentDef = safeNumber(equippedItem.def);
    const currentHp = safeNumber(equippedItem.hp);
    const currentCrit = safeNumber(equippedItem.crit);

    const nextAtk = safeNumber(item.atk);
    const nextDef = safeNumber(item.def);
    const nextHp = safeNumber(item.hp);
    const nextCrit = safeNumber(item.crit);

    return [
        `⚔️ ATK: ${currentAtk} → ${nextAtk} (${formatDelta(nextAtk - currentAtk)})`,
        `🛡️ DEF: ${currentDef} → ${nextDef} (${formatDelta(nextDef - currentDef)})`,
        `❤️ HP: ${currentHp} → ${nextHp} (${formatDelta(nextHp - currentHp)})`,
        `💥 CRIT: ${currentCrit}% → ${nextCrit}% (${formatDelta(nextCrit - currentCrit, { isPercent: true })})`
    ].join('\n');
}

function buildEnhancedItemDetailText({
    item,
    slotLabel,
    slotIcon,
    buildRuleText,
    comparisonStatus,
    comparisonDetail,
    equippedItem = null,
    isEquipped = false
}) {
    const rarityEmoji = getRarityEmoji(item.rarity);
    const equippedLabel = isEquipped ? '\n⭐ *Status:* Equipado' : '';
    const loreBlock = buildLoreBlock(item);

    let text = `${item.emoji || slotIcon || '📦'} *${escapeMarkdown(String(item.name || 'Item').toUpperCase())}*\n\n`;
    text += `${rarityEmoji} ${escapeMarkdown(item.rarity || 'Comum')} • Lv.${item.level || 1}\n`;
    text += `Tipo: ${escapeMarkdown(slotLabel || item.displayCategory || 'Item')}\n`;
    text += `Classe: ${escapeMarkdown(getAllowedClassesLabel(item))}\n`;
    text += `Build: ${escapeMarkdown(buildRuleText || 'Item de equipamento.')}${equippedLabel}\n\n`;

    if (loreBlock) {
        text += `${loreBlock}\n\n`;
    }

    text += `*Atributos*\n${escapeMarkdown(buildVerticalStats(item))}\n\n`;
    text += `*Comparação por atributo*\n${escapeMarkdown(buildAttributeComparisonBlock(item, equippedItem, { isEquipped }))}\n\n`;
    text += `*Poder:* ${calcItemPower(item)}${item.powerTier ? ` • ${escapeMarkdown(item.powerTier)}` : ''}\n`;
    text += `*Comparação:* ${escapeMarkdown(comparisonStatus || 'Sem comparação')}\n`;
    text += `${escapeMarkdown(comparisonDetail || 'Nenhum item equipado neste slot.')}\n\n`;
    text += 'Ao equipar, o sistema remove automaticamente combinações inválidas. Nenhum item é perdido.';

    return text.trim();
}

module.exports = {
    escapeMarkdown,
    calcItemPower,
    buildLoreBlock,
    buildAttributeComparisonBlock,
    buildEnhancedItemDetailText
};
