const {
    getRarityEmoji,
    getSoulCooldownTurns,
    isPassiveSoul
} = require('../core/player/souls');

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━';
const EMPTY_SLOT = '⬜ Vazio';

const ROMAN_TIERS = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V'
};

const SOUL_SOURCE_LABELS = {
    alpha_shadow_wolf: 'Alfa da Matilha',
    forest_guardian: 'Guardião da Floresta',
    lord_of_crypt: 'Lorde da Cripta',
    swamp_guardian: 'Guardião do Pântano',
    lord_of_decay: 'Lorde da Putrefação',
    void_drake: 'Draco do Vazio',
    noctra_avatar: 'Avatar de Noctra'
};

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
    return `Grau ${ROMAN_TIERS[tier] || tier}`;
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
    return `${getRarityEmoji(rarity)} ${escapeMarkdown(rarity)} • ${escapeMarkdown(getSoulTierLabel(soul))} • ${formatSoulLevel(soul)}`;
}

function getSoulTypeLine(soul = {}) {
    const effect = soul.effect || {};

    if (effect.type === 'damage') return '⚔️ Habilidade ativa';
    if (effect.type === 'heal') return '💚 Cura ativa';
    if (effect.type === 'lifesteal') return '🩸 Roubo de vida';
    if (effect.type === 'passive') return '🌘 Passiva permanente';
    return '✨ Poder especial';
}

function buildSoulCooldownLine(soul = {}) {
    if (isPassiveSoul(soul)) return '🌘 Passiva permanente';

    const cooldown = getSoulCooldownTurns(soul);
    if (cooldown <= 0) return '⏳ Sem recarga';
    return `⏳ Recarga: ${cooldown} turnos`;
}

function buildSoulEffectSummary(soul = {}) {
    const effect = soul.effect || {};

    if (effect.type === 'damage') {
        const parts = [`${formatPercent(effect.multiplier, true)} do ATK`];
        if (effect.freezeChance) parts.push(`${formatPercent(effect.freezeChance)} congelar`);
        return `Golpe ativo • ${parts.join(' • ')}`;
    }

    if (effect.type === 'heal') {
        return `Cura ativa • ${formatPercent(effect.multiplier, true)} do HP máximo`;
    }

    if (effect.type === 'lifesteal') {
        return `Drenagem • ${formatPercent(effect.multiplier, true)} do ATK • cura ${formatPercent(effect.healPercent)}`;
    }

    if (effect.type === 'passive') {
        const parts = [];
        if (effect.atkBonus) parts.push(`ATK +${effect.atkBonus}`);
        if (effect.defBonus) parts.push(`DEF +${effect.defBonus}`);
        if (effect.hpBonus) parts.push(`HP +${effect.hpBonus}`);
        if (effect.critBonus) parts.push(`CRIT +${effect.critBonus}%`);
        return parts.length ? `Passiva • ${parts.join(' • ')}` : 'Passiva permanente';
    }

    return 'Efeito especial';
}

function buildSoulEffectDetail(soul = {}) {
    const effect = soul.effect || {};
    const lines = [];

    if (effect.type === 'damage') {
        lines.push(`Causa ${formatPercent(effect.multiplier, true)} do seu ATK como dano.`);
        if (effect.freezeChance) lines.push(`Chance de congelar: ${formatPercent(effect.freezeChance)}.`);
    } else if (effect.type === 'heal') {
        lines.push(`Restaura ${formatPercent(effect.multiplier, true)} do seu HP máximo.`);
    } else if (effect.type === 'lifesteal') {
        lines.push(`Causa ${formatPercent(effect.multiplier, true)} do seu ATK como dano.`);
        lines.push(`Cura ${formatPercent(effect.healPercent)} do dano causado.`);
    } else if (effect.type === 'passive') {
        lines.push('Não precisa ser ativada em combate.');
        lines.push('Enquanto equipada, fortalece sua build.');
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
    const label = SOUL_SOURCE_LABELS[soul.bossId];
    if (label) return `Origem: ${label}`;
    return 'Origem: bosses, dungeons e eventos';
}

function buildSoulCommandHelpLine() {
    return 'Escolha abaixo em qual slot deseja equipar.';
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
    const numericIndex = Number(index);
    const indexLabel = Number.isInteger(numericIndex) && numericIndex > 0 ? `${numericIndex}. ` : '';

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
    text += `Equipe até 2 almas para definir seu estilo de combate.\n\n`;
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

    let text = `${getSoulName(soul)}\n`;
    text += `${DIVIDER}\n`;
    text += `${getSoulIdentityLine(soul)}\n`;
    text += `${escapeMarkdown(getSoulTypeLine(soul))}\n`;
    text += `${escapeMarkdown(buildSoulCooldownLine(soul))}\n`;
    if (slotLabel) text += `Equipamento: ${slotLabel}\n`;

    text += `\n✨ *EFEITO*\n`;
    text += `${escapeMarkdown(buildSoulEffectDetail(soul))}\n\n`;
    text += `📈 *EVOLUÇÃO*\n`;
    text += `${escapeMarkdown(buildSoulProgressLine(soul))}\n`;
    text += `${escapeMarkdown(getSoulSourceText(soul))}\n\n`;
    text += `🎒 ${escapeMarkdown(buildSoulCommandHelpLine(soul))}`;

    return text.trim();
}

function buildSoulDropText(soul = {}, context = {}) {
    const enemyName = context.enemyName || context.enemy?.name || 'um boss sombrio';
    const source = context.sourceLabel || 'Boss';

    let text = `🌑 *ALMA ENCONTRADA*\n`;
    text += `${DIVIDER}\n`;
    text += `${source}: ${escapeMarkdown(enemyName)}\n\n`;
    text += `${buildSoulCard(soul, null)}\n\n`;
    text += `A alma foi adicionada à sua coleção. Abra o inventário para equipar.`;

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
    getSoulTypeLine,
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
