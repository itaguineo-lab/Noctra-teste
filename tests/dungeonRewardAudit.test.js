const test = require('node:test');
const assert = require('node:assert/strict');

const {
    pct,
    ratio,
    scoreStatus,
    getWorstStatus,
    buildDungeonRewardAudit,
    renderDungeonRewardAudit
} = require('../src/core/dungeon/dungeonRewardAudit');

function buildSummary(overrides = {}) {
    return {
        counters: {
            combatsWon: 100,
            fieldGoldAwarded: 10000,
            fieldXpAwarded: 8000,
            dungeonsStarted: 10,
            dungeonsCompleted: 8,
            dungeonsAbandoned: 2,
            dungeonEliteStarted: 2,
            dungeonEliteCompleted: 1,
            dungeonGoldAwarded: 3200,
            dungeonXpAwarded: 2800,
            dungeonEliteGoldAwarded: 900,
            dungeonEliteXpAwarded: 750,
            dungeonCompletionItems: 8,
            dungeonCommonCompletionItems: 7,
            dungeonEliteCompletionItems: 1,
            keysDropped: 12,
            keysSpent: 10,
            ...overrides.counters
        },
        sourceRarity: {
            dungeon: {
                comum: 0,
                incomum: 3,
                raro: 3,
                epico: 1,
                lendario: 0,
                mitico: 0,
                unknown: 0
            },
            dungeonElite: {
                comum: 0,
                incomum: 0,
                raro: 0,
                epico: 1,
                lendario: 0,
                mitico: 1,
                unknown: 0
            },
            ...overrides.sourceRarity
        }
    };
}

test('pct e ratio evitam divisão por zero', () => {
    assert.equal(pct(1, 0), 0);
    assert.equal(ratio(1, 0), 0);
});

test('scoreStatus classifica limites max e min', () => {
    assert.equal(scoreStatus(50, { direction: 'max', danger: 45, warning: 25 }), 'danger');
    assert.equal(scoreStatus(30, { direction: 'max', danger: 45, warning: 25 }), 'warning');
    assert.equal(scoreStatus(10, { direction: 'max', danger: 45, warning: 25 }), 'ok');

    assert.equal(scoreStatus(1.5, { direction: 'min', danger: 2, warning: 3 }), 'danger');
    assert.equal(scoreStatus(2.5, { direction: 'min', danger: 2, warning: 3 }), 'warning');
    assert.equal(scoreStatus(3.5, { direction: 'min', danger: 2, warning: 3 }), 'ok');
});

test('getWorstStatus prioriza danger sobre warning e ok', () => {
    assert.equal(getWorstStatus(['ok', 'warning']), 'warning');
    assert.equal(getWorstStatus(['ok', 'danger', 'warning']), 'danger');
    assert.equal(getWorstStatus(['ok', 'ok']), 'ok');
});

test('buildDungeonRewardAudit marca dungeon saudável como ok', () => {
    const audit = buildDungeonRewardAudit(buildSummary());

    assert.equal(audit.derived.commonGoldRatioVsField, 4);
    assert.equal(audit.derived.commonXpRatioVsField, 4.38);
    assert.equal(audit.derived.commonCompletionItemRate, 87.5);
    assert.equal(audit.derived.keyNet, 2);
    assert.equal(audit.signals.find(s => s.id === 'common_mythic_leak').status, 'ok');
});

test('buildDungeonRewardAudit detecta dungeon comum pagando pouco', () => {
    const audit = buildDungeonRewardAudit(buildSummary({
        counters: {
            dungeonGoldAwarded: 800,
            dungeonXpAwarded: 600,
            dungeonCommonCompletionItems: 3
        }
    }));

    assert.equal(audit.status, 'danger');
    assert.equal(audit.signals.find(s => s.id === 'common_dungeon_gold_value').status, 'danger');
    assert.equal(audit.signals.find(s => s.id === 'common_dungeon_xp_value').status, 'danger');
    assert.equal(audit.signals.find(s => s.id === 'completion_item_rate').status, 'danger');
});

test('buildDungeonRewardAudit bloqueia vazamento de mítico em dungeon comum', () => {
    const audit = buildDungeonRewardAudit(buildSummary({
        sourceRarity: {
            dungeon: {
                mitico: 1
            }
        }
    }));

    assert.equal(audit.status, 'danger');
    assert.equal(audit.signals.find(s => s.id === 'common_mythic_leak').status, 'danger');
});

test('renderDungeonRewardAudit inclui bloco de auditoria', () => {
    const text = renderDungeonRewardAudit(buildSummary());

    assert.match(text, /Auditoria Dungeon/);
    assert.match(text, /Ouro dungeon\/campo/);
    assert.match(text, /XP dungeon\/campo/);
    assert.match(text, /Saldo líquido de chaves/);
});
