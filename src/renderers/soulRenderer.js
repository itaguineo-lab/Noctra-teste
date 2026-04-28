const {
    getRarityEmoji,
    getSoulCooldownTurns,
    isPassiveSoul
} = require('../core/player/souls');

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━';
const EMPTY_SLOT = '⬜ Vazio';

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function formatPercent(value, multiplierBase = false) {
    const n = safeNumber(value, multiplierBase ? 1 : 0);
    const percent = multiplierBase ? Math.round(n * 100) : Math.round(n * 100);
    return `${percent}%`;
}

function formatSoulLevel(soul = {}) {
    const level = Math.max(1, safeNumber(soul.level, 1));
    const awaken = Math.max(0, safeNumber(soul.awakenLevel, 0));

    if (awaken > 0) return `Lv.${level} • Despertar +${awaken}`;
    return `Lv.${level}`;
}

function getSoulTierLabel(soul = {}) {
    const tier = Math.max(1, safeNumber(soul.tier, 1));
    return `Tier ${tier}`;
}

function getSoulCommandId(soul = {}) {
    return String(soul.id || soul.instanceId || '').trim();
}

function getSoulInstanceId(soul = {}) {
    return String(soul.instanceId || '').trim();
}

function getSoulName(soul = {}) {
    return `${soul.emoji || '💀'} ${escapeMarkdown(soul.name || 'Alma Desconhecida')}`;
}

function getSoulIdentityLine(soul = {}) {
    const rarity = soul.rarity || 'Raro';
    return `${getRarityEmoji(rarity)} ${escapeMarkdown(rarity)} • ${escapeMarkdown(getSoulTierLabel(soul))} • ${escapeMarkdown(formatSoulLevel(soul))}`;
}

function buildSoulCooldownLine(soul = {}) {
    if (isPassiveSoul(soul)) return 'Tipo: Passiva permanente';

    const cooldown = getSoulCooldownTurns(soul);
    if (cooldown <= 0) return 'Recarga: sem cooldown';
    return `Recarga: ${cooldown} turnos`;
}

function buildSoulEffectSummary(soul = {}) {
    const effect = soul.effect || {};

    if (effect.type === 'damage') {
        const parts = [`Dano ${formatPercent(effect.multiplier, true)} ATK`];
        if (effect.freezeChance) parts.push(`${formatPercent(effect.freezeChance)} congelar`);
        return parts.join(' • ');
    }

    if (effect.type === 'heal') {
        return `Cura ${formatPercent(effect.multiplier, true)} HP máx.`;
    }

    if (effect.type === 'lifesteal') {
        return `Dano ${formatPercent(effect.multiplier, true)} ATK • Cura ${formatPercent(effect.healPercent)} dano`;
    }

    if (effect.type === 'passive') {
        const parts = [];
        if (effect.atkBonus) parts.push(`ATK +${effect.atkBonus}`);
        if (effect.defBonus) parts.push(`DEF +${effect.defBonus}`);
        if (effect.hpBonus) parts.push(`HP +${effect.hpBonus}`);
        if (effect.critBonus) parts.push(`CRIT +${effect.critBonus}%`);
        return parts.length ? `Passiva • ${parts.join(' • ')}` : 'Passiva';
    }

    return 'Efeito especial';
}

function buildSoulEffectDetail(soul = {}) {
    const effect = soul.effect || {};
    const lines = [];

    if (effect.type === 'damage') {
        lines.push(`⚔️ Dano: ${formatPercent(effect.multiplier, true)} do ATK`);
        if (effect.freezeChance) lines.push(`❄️ Controle: ${formatPercent(effect.freezeChance)} de chance de congelar`);
    } else if (effect.type === 'heal') {
        lines.push(`💚 Cura: ${formatPercent(effect.multiplier, true)} do HP máximo`);
    } else if (effect.type === 'lifesteal') {
        lines.push(`🩸 Dano: ${formatPercent(effect.multiplier, true)} do ATK`);
        lines.push(`❤️ Cura: ${formatPercent(effect.healPercent)} do dano causado`);
    } else if (effect.type === 'passive') {
        lines.push('🌘 Esta alma não é ativada em combate.');
        lines.push('Ela fortalece sua build enquanto estiver equipada.');
        if (effect.atkBonus) lines.push(`⚔️ ATK +${effect.atkBonus}`);
        if (effect.defBonus) lines.push(`🛡️ DEF +${effect.defBonus}`);
        if (effect.hpBonus) lines.push(`❤️ HP +${effect.hpBonus}`);
        if (effect.critBonus) lines.push(`💥 CRIT +${effect.critBonus}%`);
    } else {
        lines.push('Efeito ainda não descrito.');
    }

    return lines.join('\n');
}

function buildSoulProgressLine(soul = {}) {
    const level = Math.max(1, safeNumber(soul.level, 1));
    const exp = Math.max(0, safeNumber(soul.exp, 0));
    const needed = Math.max(1, level * 3);
    const shards = Math.max(0, safeNumber(soul.shards, 0));

    return `XP ${exp}/${needed} • Fragmentos ${shards}`;
}

function getSoulSourceText(soul = {}) {
    if (soul.bossId) return `Fonte: ${escapeMarkdown(soul.bossId)}`;
    return 'Fonte: bosses, dungeons e eventos';
}

function buildSoulCommandHelpLine(soul = {}) {
    const commandId = getSoulCommandId(soul);
    if (!commandId) return 'Use os botões abaixo para equipar.';
    return `/equipsoul ${commandId} 1 ou /equipsoul ${commandId} 2`;
}

function buildEquippedSoulsBlock(equipped = []) {
    const slots = Array.isArray(equipped) ? equipped.slice(0, 2) : [];
    while (slots.length < 2) slots.push(null);

    let text = `🌑 *EQUIPADAS*\n`;
    slots.forEach((soul, index) => {
        if (!soul) {
            text += `${index + 1}. ${EMPTY_SLOT}\n`;
            return;
        }

        text += `${index + 1}. ${getSoulName(soul)}\n`;
        text += `   ${escapeMarkdown(buildSoulEffectSummary(soul))}\n`;
    });

    return text.trim();
}

function buildSoulCard(soul = {}, index = 1, options = {}) {
    const equipped = options.equipped ? ' ⭐ EQUIPADA' : '';
    const indexLabel = Number.isFinite(Number(index)) ? `${index}. ` : '';

    return [
        `${indexLabel}${getSoulName(soul)}${equipped}`,
        getSoulIdentityLine(soul),
        escapeMarkdown(buildSoulEffectSummary(soul)),
        escapeMarkdown(buildSoulCooldownLine(soul)),
        escapeMarkdown(buildSoulProgressLine(soul))
    ].join('\n');
}

function buildSoulCollectionBlock(souls = [], equipped = []) {
    const list = Array.isArray(souls) ? souls : [];
    const equippedKeys = new Set(
        (Array.isArray(equipped) ? equipped : [])
            .filter(Boolean)
            .map(soul => soul.instanceId || soul.id)
    );

    let text = `📚 *COLEÇÃO* (${list.length})\n`;

    if (!list.length) {
        text += 'Nenhuma alma encontrada.\n';
        text += 'Derrote bosses para tentar obter sua primeira alma.';
        return text;
    }

    list.forEach((soul, index) => {
        const key = soul.instanceId || soul.id;
        text += `\n${buildSoulCard(soul, index + 1, { equipped: equippedKeys.has(key) })}\n`;
    });

    return text.trim();
}

function buildSoulsOverviewText(player = {}) {
    const souls = Array.isArray(player.soulsInventory) ? player.soulsInventory : [];
    const equipped = Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null];
    const pity = Math.max(0, safeNumber(player.soulPityCounter, 0));

    let text = `💀 *ALMAS*\n`;
    text += `${DIVIDER}\n`;
    text += `Equipe até 2 almas para moldar sua build.\n\n`;
    text += `${buildEquippedSoulsBlock(equipped)}\n\n`;
    text += `${DIVIDER}\n`;
    text += `${buildSoulCollectionBlock(souls, equipped)}\n\n`;
    text += `${DIVIDER}\n`;
    text += `🎯 Pity de boss: ${pity}`;

    return text.trim();
}

function buildSoulDetailText(soul = {}, options = {}) {
    const slotLabel = options.slot !== undefined && options.slot !== null
        ? `Slot ${Number(options.slot) + 1}`
        : null;
    const commandId = getSoulCommandId(soul);

    let text = `${getSoulName(soul)}\n`;
    text += `${DIVIDER}\n`;
    text += `${getSoulIdentityLine(soul)}\n`;
    text += `${escapeMarkdown(buildSoulCooldownLine(soul))}\n`;
    if (slotLabel) text += `Status: equipada no ${slotLabel}\n`;
    if (commandId) text += `ID: ${escapeMarkdown(commandId)}\n`;

    text += `\n✨ *EFEITO*\n`;
    text += `${escapeMarkdown(buildSoulEffectDetail(soul))}\n\n`;
    text += `📈 *PROGRESSO*\n`;
    text += `${escapeMarkdown(buildSoulProgressLine(soul))}\n`;
    text += `${escapeMarkdown(getSoulSourceText(soul))}\n\n`;
    text += `⌨️ ${escapeMarkdown(buildSoulCommandHelpLine(soul))}`;

    return text.trim();
}

function buildSoulDropText(soul = {}, context = {}) {
    const enemyName = context.enemyName || context.enemy?.name || 'um boss sombrio';
    const source = context.sourceLabel || 'Boss';

    let text = `🌑 *ALMA ENCONTRADA*\n`;
    text += `${DIVIDER}\n`;
    text += `${source}: ${escapeMarkdown(enemyName)}\n\n`;
    text += `${buildSoulCard(soul, null)}\n\n`;
    text += `Abra o inventário para equipar.`;

    return text.trim();
}

module.exports = {
    DIVIDER,
    escapeMarkdown,
    formatSoulLevel,
    getSoulTierLabel,
    getSoulCommandId,
    getSoulInstanceId,
    getSoulIdentityLine,
    buildSoulCooldownLine,
    buildSoulEffectSummary,
    buildSoulEffectDetail,
    buildSoulProgressLine,
    buildSoulCommandHelpLine,
    buildEquippedSoulsBlock,
    buildSoulCard,
    buildSoulCollectionBlock,
    buildSoulsOverviewText,
    buildSoulDetailText,
    buildSoulDropText
};
