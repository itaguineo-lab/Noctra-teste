function num(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function pct(part, total) {
    const denominator = num(total);
    if (denominator <= 0) return 0;
    return (num(part) / denominator) * 100;
}

function ratio(part, total) {
    const denominator = num(total);
    if (denominator <= 0) return 0;
    return num(part) / denominator;
}

function round(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(num(value) * factor) / factor;
}

function scoreStatus(value, rules) {
    const n = num(value);

    if (rules.direction === 'max') {
        if (n >= rules.danger) return 'danger';
        if (n >= rules.warning) return 'warning';
        return 'ok';
    }

    if (n <= rules.danger) return 'danger';
    if (n <= rules.warning) return 'warning';
    return 'ok';
}

function getWorstStatus(statuses = []) {
    if (statuses.includes('danger')) return 'danger';
    if (statuses.includes('warning')) return 'warning';
    return 'ok';
}

function getStatusEmoji(status) {
    if (status === 'danger') return '🔴';
    if (status === 'warning') return '🟡';
    return '🟢';
}

function buildDungeonRewardAudit(summary = {}) {
    const c = summary.counters || {};
    const sourceRarity = summary.sourceRarity || {};
    const dungeonRarity = sourceRarity.dungeon || {};
    const eliteRarity = sourceRarity.dungeonElite || {};

    const fieldWins = num(c.combatsWon);
    const dungeonCompleted = num(c.dungeonsCompleted);
    const dungeonStarted = num(c.dungeonsStarted);
    const eliteCompleted = num(c.dungeonEliteCompleted);
    const commonDungeonCompleted = Math.max(0, dungeonCompleted - eliteCompleted);

    const fieldGoldPerWin = ratio(c.fieldGoldAwarded, fieldWins);
    const fieldXpPerWin = ratio(c.fieldXpAwarded, fieldWins);
    const commonDungeonGoldPerCompletion = ratio(c.dungeonGoldAwarded, commonDungeonCompleted);
    const commonDungeonXpPerCompletion = ratio(c.dungeonXpAwarded, commonDungeonCompleted);
    const eliteDungeonGoldPerCompletion = ratio(c.dungeonEliteGoldAwarded, eliteCompleted);
    const eliteDungeonXpPerCompletion = ratio(c.dungeonEliteXpAwarded, eliteCompleted);

    const commonGoldRatioVsField = fieldGoldPerWin > 0 ? commonDungeonGoldPerCompletion / fieldGoldPerWin : 0;
    const commonXpRatioVsField = fieldXpPerWin > 0 ? commonDungeonXpPerCompletion / fieldXpPerWin : 0;
    const commonCompletionItemRate = pct(c.dungeonCommonCompletionItems, commonDungeonCompleted);
    const dungeonFinishRate = pct(c.dungeonsCompleted, c.dungeonsStarted);
    const dungeonAbandonRate = pct(c.dungeonsAbandoned, c.dungeonsStarted);
    const keyNet = num(c.keysDropped) - num(c.keysSpent);
    const commonMythicLeaks = num(dungeonRarity.mitico);
    const eliteMythicDrops = num(eliteRarity.mitico);

    const signals = [
        {
            id: 'common_dungeon_gold_value',
            label: 'Valor ouro da dungeon comum vs campo',
            value: round(commonGoldRatioVsField, 2),
            unit: 'x',
            status: commonDungeonCompleted > 0 && fieldGoldPerWin > 0
                ? scoreStatus(commonGoldRatioVsField, { direction: 'min', danger: 2.0, warning: 3.0 })
                : 'warning',
            note: 'Dungeon comum precisa pagar mais que farm comum porque consome chave rara.'
        },
        {
            id: 'common_dungeon_xp_value',
            label: 'Valor XP da dungeon comum vs campo',
            value: round(commonXpRatioVsField, 2),
            unit: 'x',
            status: commonDungeonCompleted > 0 && fieldXpPerWin > 0
                ? scoreStatus(commonXpRatioVsField, { direction: 'min', danger: 2.0, warning: 3.0 })
                : 'warning',
            note: 'XP da dungeon precisa parecer pico de sessão.'
        },
        {
            id: 'completion_item_rate',
            label: 'Taxa de item final comum por dungeon comum concluída',
            value: round(commonCompletionItemRate, 1),
            unit: '%',
            status: commonDungeonCompleted > 0
                ? scoreStatus(commonCompletionItemRate, { direction: 'min', danger: 80, warning: 95 })
                : 'warning',
            note: 'Conclusão de dungeon comum precisa gerar loot claro.'
        },
        {
            id: 'dungeon_finish_rate',
            label: 'Conclusão de dungeon',
            value: round(dungeonFinishRate, 1),
            unit: '%',
            status: dungeonStarted > 0
                ? scoreStatus(dungeonFinishRate, { direction: 'min', danger: 35, warning: 55 })
                : 'warning',
            note: 'Finish rate baixo indica dificuldade, UX confusa ou custo frustrante.'
        },
        {
            id: 'dungeon_abandon_rate',
            label: 'Abandono de dungeon',
            value: round(dungeonAbandonRate, 1),
            unit: '%',
            status: dungeonStarted > 0
                ? scoreStatus(dungeonAbandonRate, { direction: 'max', danger: 45, warning: 25 })
                : 'warning',
            note: 'Abandono alto destrói valor percebido da chave.'
        },
        {
            id: 'key_net',
            label: 'Saldo líquido de chaves',
            value: keyNet,
            unit: '',
            status: scoreStatus(keyNet, { direction: 'min', danger: -10, warning: -3 }),
            note: 'Saldo negativo trava dungeon; positivo demais banaliza entrada.'
        },
        {
            id: 'common_mythic_leak',
            label: 'Mítico em dungeon comum',
            value: commonMythicLeaks,
            unit: '',
            status: commonMythicLeaks > 0 ? 'danger' : 'ok',
            note: 'Mítico em dungeon comum quebra escassez.'
        },
        {
            id: 'elite_mythic_presence',
            label: 'Mítico em dungeon elite',
            value: eliteMythicDrops,
            unit: '',
            status: eliteCompleted > 0 && eliteMythicDrops === 0 ? 'warning' : 'ok',
            note: 'Elite sem Mítico percebido vira dungeon comum com skin diferente.'
        }
    ];

    return {
        status: getWorstStatus(signals.map(signal => signal.status)),
        signals,
        derived: {
            fieldGoldPerWin: round(fieldGoldPerWin, 1),
            fieldXpPerWin: round(fieldXpPerWin, 1),
            commonDungeonCompleted,
            commonDungeonGoldPerCompletion: round(commonDungeonGoldPerCompletion, 1),
            commonDungeonXpPerCompletion: round(commonDungeonXpPerCompletion, 1),
            eliteDungeonGoldPerCompletion: round(eliteDungeonGoldPerCompletion, 1),
            eliteDungeonXpPerCompletion: round(eliteDungeonXpPerCompletion, 1),
            commonGoldRatioVsField: round(commonGoldRatioVsField, 2),
            commonXpRatioVsField: round(commonXpRatioVsField, 2),
            commonCompletionItemRate: round(commonCompletionItemRate, 1),
            dungeonFinishRate: round(dungeonFinishRate, 1),
            dungeonAbandonRate: round(dungeonAbandonRate, 1),
            keyNet
        }
    };
}

function renderDungeonRewardAudit(summary = {}) {
    const audit = buildDungeonRewardAudit(summary);

    const lines = [
        `🏰 *Auditoria Dungeon* ${getStatusEmoji(audit.status)}`,
        `• Ouro dungeon/campo: ${audit.derived.commonGoldRatioVsField}x`,
        `• XP dungeon/campo: ${audit.derived.commonXpRatioVsField}x`,
        `• Item final comum/conclusão: ${audit.derived.commonCompletionItemRate}%`,
        `• Conclusão: ${audit.derived.dungeonFinishRate}% | Abandono: ${audit.derived.dungeonAbandonRate}%`,
        `• Saldo líquido de chaves: ${audit.derived.keyNet}`,
        '',
        '*Sinais*'
    ];

    audit.signals.forEach(signal => {
        lines.push(`${getStatusEmoji(signal.status)} ${signal.label}: ${signal.value}${signal.unit}`);
    });

    return lines.join('\n');
}

module.exports = {
    num,
    pct,
    ratio,
    round,
    scoreStatus,
    getWorstStatus,
    getStatusEmoji,
    buildDungeonRewardAudit,
    renderDungeonRewardAudit
};
