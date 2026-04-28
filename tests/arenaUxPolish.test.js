const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildArenaHubText,
    buildArenaBattleText,
    buildArenaLeaderboardText,
    buildArenaChestListText
} = require('../src/core/arena/arenaService');

function basePlayer(overrides = {}) {
    return {
        id: '1',
        name: 'Admin',
        level: 10,
        atk: 40,
        def: 20,
        maxHp: 200,
        hp: 200,
        crit: 8,
        gold: 0,
        glorias: 12,
        arena: {
            points: 120,
            coins: 0,
            wins: 7,
            losses: 3,
            streak: 2,
            maxStreak: 5,
            chests: [],
            leagueId: 'bronze'
        },
        ...overrides
    };
}

function baseBattle(overrides = {}) {
    return {
        player: {
            name: 'Admin',
            leagueEmoji: '🥉',
            leagueName: 'Bronze',
            hp: 120,
            maxHp: 200,
            atk: 40,
            def: 20,
            crit: 8,
            power: 400,
            defending: false
        },
        enemy: {
            name: 'Eco Sombrio',
            leagueEmoji: '🥉',
            leagueName: 'Bronze',
            hp: 80,
            maxHp: 150,
            atk: 34,
            def: 18,
            crit: 6,
            power: 360,
            defending: false
        },
        logs: [
            '⚔️ Admin golpeia Eco Sombrio.',
            '💥 Eco Sombrio recebe dano.'
        ],
        ...overrides
    };
}

test('buildArenaHubText renderiza Arena com hierarquia visual melhorada', () => {
    const text = buildArenaHubText(basePlayer());

    assert.match(text, /ARENA DE NOCTRA/);
    assert.match(text, /━━━━━━━━━━━━━━━━━━━━━━/);
    assert.match(text, /STATUS COMPETITIVO/);
    assert.match(text, /DESEMPENHO/);
    assert.match(text, /PROGRESSÃO DE LIGA/);
    assert.match(text, /Aproveitamento: \*70%\*/);
    assert.match(text, /Glórias/);
    assert.doesNotMatch(text, /Moedas da Arena/i);
});

test('buildArenaBattleText renderiza duelo compacto e legível', () => {
    const text = buildArenaBattleText(baseBattle());

    assert.match(text, /DUELO DA ARENA/);
    assert.match(text, /Admin/);
    assert.match(text, /Eco Sombrio/);
    assert.match(text, /Últimas ações/);
    assert.match(text, /💥 400/);
    assert.match(text, /━━━━━━━━━━━━━━━━━━━━━━/);
});

test('buildArenaLeaderboardText renderiza ranking com aproveitamento', () => {
    const players = [
        basePlayer({ id: '1', name: 'Admin', arena: { points: 1200, wins: 8, losses: 2, streak: 0, maxStreak: 0, chests: [], leagueId: 'silver', coins: 0 } }),
        basePlayer({ id: '2', name: 'Rival', arena: { points: 800, wins: 4, losses: 6, streak: 0, maxStreak: 0, chests: [], leagueId: 'silver', coins: 0 } })
    ];

    const text = buildArenaLeaderboardText(players);

    assert.match(text, /RANKING DA ARENA/);
    assert.match(text, /Admin/);
    assert.match(text, /Rival/);
    assert.match(text, /📊 80%/);
    assert.match(text, /📊 40%/);
});

test('buildArenaChestListText mostra status pronto e faixa de recompensa', () => {
    const now = Date.now();
    const player = basePlayer({
        arena: {
            points: 120,
            coins: 0,
            wins: 7,
            losses: 3,
            streak: 2,
            maxStreak: 5,
            leagueId: 'bronze',
            chests: [
                { id: 'ready', tier: 'wood', readyAt: now - 1000 },
                { id: 'locked', tier: 'iron', readyAt: now + 60_000 }
            ]
        }
    });

    const text = buildArenaChestListText(player);

    assert.match(text, /BAÚS DA ARENA/);
    assert.match(text, /✅ Pronto para abrir/);
    assert.match(text, /⏳ Abre em/);
    assert.match(text, /Glórias/);
    assert.match(text, /Slots ocupados: \*2\/3\*/);
});

test('buildArenaChestListText vazio incentiva próxima vitória', () => {
    const text = buildArenaChestListText(basePlayer());

    assert.match(text, /Nenhum baú ativo/);
    assert.match(text, /Vença uma luta/);
});
