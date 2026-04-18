const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    getAllPlayers
} = require('../core/player/playerService');

const {
    ensureArenaState,
    snapshotArenaPlayer,
    selectArenaOpponentSnapshot,
    buildArenaHubText,
    buildArenaBattleText,
    buildArenaLeaderboardText,
    buildArenaChestListText,
    openArenaChest,
    resolveArenaVictory,
    resolveArenaLoss,
    resolveArenaFlee,
    getArenaChestRemainingText,
    ARENA_CHEST_CONFIG
} = require('../core/arena/arenaService');

const {
    createAndStoreArenaBattle,
    getStoredArenaBattle,
    persistArenaMessage,
    removeStoredArenaBattle,
    runArenaAttack,
    runArenaDefend,
    runArenaFlee,
    runArenaConsumable
} = require('../core/arena/arenaBattleService');

const {
    restoreEnergy,
    consumeConsumable,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    updateMissionProgress
} = require('../core/daily/dailyService');

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

/*
=================================
HELPERS
=================================
*/

function getChestConfigSafe(tier) {
    return ARENA_CHEST_CONFIG[tier] || ARENA_CHEST_CONFIG.wood;
}

async function safeSend(ctx, text, options = {}) {
    return navigateText(ctx, text, {
        parse_mode: 'Markdown',
        ...options
    });
}

function battleKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Atacar', 'arena_attack'),
            Markup.button.callback('🛡️ Defender', 'arena_defend')
        ],
        [
            Markup.button.callback('🧪 Consumíveis', 'arena_consumables'),
            Markup.button.callback('🏳️ Fugir', 'arena_flee')
        ],
        [
            Markup.button.callback('🏟️ Arena', 'arena')
        ]
    ]);
}

function hubKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Procurar Oponente', 'arena_fight')
        ],
        [
            Markup.button.callback('🎁 Baús', 'arena_chests'),
            Markup.button.callback('🏆 Ranking', 'arena_ranking')
        ],
        [
            Markup.button.callback('🏪 Loja Arena', 'arena_shop')
        ],
        [
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

async function getBattle(userId) {
    return getStoredArenaBattle(userId);
}

async function persistBattleHp(playerId, stored) {
    const player = await getPlayer(playerId);
    if (!player || !stored?.battle) return null;

    ensureArenaState(player);

    player.hp = Math.max(
        1,
        Math.min(
            stored.battle.player.hp,
            player.maxHp || stored.battle.player.hp
        )
    );

    normalizePlayerForSave(player);
    await savePlayer(playerId, player);
    return player;
}

function buildBattleResultKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Lutar de novo', 'arena_fight')],
        [
            Markup.button.callback('🎁 Baús', 'arena_chests'),
            Markup.button.callback('🏆 Ranking', 'arena_ranking')
        ],
        [Markup.button.callback('🏪 Loja Arena', 'arena_shop')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

async function finishBattle(ctx, stored, resultType) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        await removeStoredArenaBattle(ctx.from.id);
        return safeSend(ctx, '❌ Jogador não encontrado.', hubKeyboard());
    }

    ensureArenaState(player);

    const battle = stored.battle;

    player.hp = Math.max(
        1,
        Math.min(
            battle.player.hp,
            player.maxHp || battle.player.hp
        )
    );

    let summaryText = '';
    const keyboard = buildBattleResultKeyboard();

    if (resultType === 'win') {
        updateMissionProgress(player, 'arena_win', 1);

        const rewards = resolveArenaVictory(player, battle);

        summaryText =
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏆 *VITÓRIA NA ARENA*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🆚 Adversário: *${battle.enemy.name}*\n` +
            `🎯 Pontos ganhos: +${rewards.pointsGained}\n` +
            `🪙 Moedas da arena: +${rewards.coinsGained}\n`;

        if (rewards.chest) {
            summaryText += `🎁 Baú recebido: ${rewards.chest.name}\n`;
        }

        if (rewards.overflowCoins) {
            summaryText += `💰 Bônus por slot cheio: +${rewards.overflowCoins}\n`;
        }

        if (rewards.leagueChanged) {
            summaryText += `\n⬆️ *Nova Liga!*\n${rewards.newLeague.emoji} ${rewards.newLeague.name}\n`;
        }

        summaryText += `\nA arena reconhece sua força.`;
    }

    if (resultType === 'loss') {
        const rewards = resolveArenaLoss(player);

        summaryText =
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💀 *DERROTA NA ARENA*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🆚 Adversário: *${battle.enemy.name}*\n` +
            `📉 Pontos perdidos: -${rewards.pointsLost}\n\n` +
            `Volte mais forte e recupere sua posição.`;
    }

    if (resultType === 'fled') {
        const rewards = resolveArenaFlee(player);

        summaryText =
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏳️ *FUGA DA ARENA*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📉 Pontos perdidos: -${rewards.pointsLost}\n\n` +
            `A arena pune hesitação.`;
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await removeStoredArenaBattle(ctx.from.id);

    return safeSend(ctx, summaryText, keyboard);
}

/*
=================================
ARENA HUB
=================================
*/

async function handleArena(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado. Use /start.');
    }

    ensureArenaState(player);

    const stored = await getBattle(ctx.from.id);
    if (stored?.battle) {
        return safeSend(ctx, buildArenaBattleText(stored.battle), battleKeyboard());
    }

    let hubText = buildArenaHubText(player);
    hubText += `\n\n🎯 *Objetivo*\n`;
    hubText += `Suba de liga, conquiste baús e acumule moedas da arena.`;

    return safeSend(ctx, hubText, hubKeyboard());
}

/*
=================================
START FIGHT
=================================
*/

async function handleArenaFight(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado. Use /start.');
    }

    ensureArenaState(player);

    const opponent = await selectArenaOpponentSnapshot(player);
    const playerSnapshot = snapshotArenaPlayer(player);

    const startingHp = Math.max(
        1,
        Math.min(
            player.hp || player.maxHp || 1,
            player.maxHp || 1
        )
    );

    const battle = await createAndStoreArenaBattle(
        ctx.from.id,
        playerSnapshot,
        opponent,
        startingHp
    );

    const introText =
        `🏟️ *DESAFIO DA ARENA*\n\n` +
        `Você encontrou um novo adversário.\n\n` +
        buildArenaBattleText(battle);

    const sent = await safeSend(ctx, introText, battleKeyboard());

    if (sent?.message_id) {
        await persistArenaMessage(ctx.from.id, sent.message_id);
    }

    return sent;
}

/*
=================================
ATTACK
=================================
*/

async function handleArenaAttack(ctx) {
    await safeAnswer(ctx);

    const stored = await getBattle(ctx.from.id);
    if (!stored) {
        return handleArena(ctx);
    }

    const updated = await runArenaAttack(ctx.from.id);
    if (!updated) {
        return handleArena(ctx);
    }

    await persistBattleHp(ctx.from.id, updated);

    if (updated.battle.status === 'win') {
        return finishBattle(ctx, updated, 'win');
    }

    if (updated.battle.status === 'loss') {
        return finishBattle(ctx, updated, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(updated.battle), battleKeyboard());
}

/*
=================================
DEFEND
=================================
*/

async function handleArenaDefend(ctx) {
    await safeAnswer(ctx);

    const stored = await getBattle(ctx.from.id);
    if (!stored) {
        return handleArena(ctx);
    }

    const updated = await runArenaDefend(ctx.from.id);
    if (!updated) {
        return handleArena(ctx);
    }

    await persistBattleHp(ctx.from.id, updated);

    if (updated.battle.status === 'loss') {
        return finishBattle(ctx, updated, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(updated.battle), battleKeyboard());
}

/*
=================================
FLEE
=================================
*/

async function handleArenaFlee(ctx) {
    await safeAnswer(ctx);

    const stored = await getBattle(ctx.from.id);
    if (!stored) {
        return handleArena(ctx);
    }

    const updated = await runArenaFlee(ctx.from.id);
    if (!updated) {
        return handleArena(ctx);
    }

    return finishBattle(ctx, updated, 'fled');
}

/*
=================================
CONSUMABLES
=================================
*/

async function handleArenaConsumables(ctx) {
    await safeAnswer(ctx);

    const stored = await getBattle(ctx.from.id);
    if (!stored?.battle) return handleArena(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.');
    }

    ensureArenaState(player);

    const c = player.consumables || {};
    const rows = [];

    if ((c.potionHp || 0) > 0) rows.push([Markup.button.callback(`❤️ Poção HP (${c.potionHp})`, 'arena_use:potionHp')]);
    if ((c.potionEnergy || 0) > 0) rows.push([Markup.button.callback(`⚡ Poção Energia (${c.potionEnergy})`, 'arena_use:potionEnergy')]);
    if ((c.tonicStrength || 0) > 0) rows.push([Markup.button.callback(`💪 Tônico Força (${c.tonicStrength})`, 'arena_use:tonicStrength')]);
    if ((c.tonicDefense || 0) > 0) rows.push([Markup.button.callback(`🛡️ Tônico Defesa (${c.tonicDefense})`, 'arena_use:tonicDefense')]);
    rows.push([Markup.button.callback('◀️ Voltar', 'arena')]);

    if (rows.length === 1) {
        return safeAnswer(ctx, '❌ Você não possui consumíveis.', { show_alert: true });
    }

    return safeSend(
        ctx,
        `🧪 *Consumíveis da Arena*\n\nEscolha um item para ganhar vantagem tática.`,
        Markup.inlineKeyboard(rows)
    );
}

async function handleArenaUseConsumable(ctx) {
    await safeAnswer(ctx);

    const key = ctx.match?.[1];
    const stored = await getBattle(ctx.from.id);
    if (!stored?.battle) return handleArena(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.');
    }

    ensureArenaState(player);
    player.consumables ??= {};

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        return safeAnswer(ctx, '❌ Item indisponível.', { show_alert: true });
    }

    const updated = await runArenaConsumable(ctx.from.id, (battle) => {
        if (key === 'potionHp') {
            const heal = Math.max(20, Math.floor(battle.player.maxHp * 0.4));
            battle.player.hp = Math.min(battle.player.maxHp, battle.player.hp + heal);
            battle.logs.push('❤️ Você usou Poção de HP e se curou.');
        } else if (key === 'potionEnergy') {
            restoreEnergy(player, 1);
            battle.logs.push('⚡ Energia +1 com Poção de Energia.');
        } else if (key === 'tonicStrength') {
            battle.player.atk += 8;
            battle.logs.push('💪 Tônico de Força: ATK +8.');
        } else if (key === 'tonicDefense') {
            battle.player.def += 8;
            battle.logs.push('🛡️ Tônico de Defesa: DEF +8.');
        }
    });

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await persistBattleHp(ctx.from.id, updated);

    if (updated.battle.status === 'loss') {
        return finishBattle(ctx, updated, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(updated.battle), battleKeyboard());
}

/*
=================================
CHESTS
=================================
*/

async function handleArenaChests(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.');
    }

    ensureArenaState(player);

    const rows = player.arena.chests.map(chest => {
        const config = getChestConfigSafe(chest.tier);
        const remaining = getArenaChestRemainingText(chest);

        const label = Date.now() >= chest.readyAt
            ? `🎁 ${config.name}`
            : `⏳ ${config.name} (${remaining})`;

        return [
            Markup.button.callback(
                label,
                `arena_open_chest:${chest.id}`
            )
        ];
    });

    rows.push([Markup.button.callback('🏟️ Voltar Arena', 'arena')]);

    let text = buildArenaChestListText(player);
    text += `\n\n🎁 *Baús da Arena*\nAbra seus baús para converter vitórias em progressão real.`;

    return safeSend(ctx, text, Markup.inlineKeyboard(rows));
}

/*
=================================
OPEN CHEST
=================================
*/

async function handleArenaOpenChest(ctx) {
    await safeAnswer(ctx);

    const chestId = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.');
    }

    ensureArenaState(player);

    const result = openArenaChest(player, chestId);

    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    let msg =
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎁 *BAÚ DA ARENA ABERTO*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🪙 Moedas da arena: +${result.rewards.arenaCoins}\n` +
        `💰 Ouro: +${result.rewards.gold}\n`;

    if (result.rewards.keys) msg += `🗝️ Chaves: +${result.rewards.keys}\n`;
    if (result.rewards.glorias) msg += `🏅 Glórias: +${result.rewards.glorias}\n`;
    if (result.rewards.consumable) msg += `🧪 Consumível: +1 ${result.rewards.consumable}\n`;

    msg += `\nRecompensas coletadas com sucesso.`;

    return safeSend(ctx, msg, hubKeyboard());
}

/*
=================================
RANKING
=================================
*/

async function handleArenaRanking(ctx) {
    await safeAnswer(ctx);

    const playersMap = await getAllPlayers();
    let text = buildArenaLeaderboardText(playersMap);
    text += `\n\n🏆 *Ranking Competitivo*\nSuba de liga, vença mais e dispute prestígio real.`;

    return safeSend(ctx, text, hubKeyboard());
}

module.exports = {
    handleArena,
    handleArenaFight,
    handleArenaAttack,
    handleArenaDefend,
    handleArenaFlee,
    handleArenaConsumables,
    handleArenaUseConsumable,
    handleArenaChests,
    handleArenaOpenChest,
    handleArenaRanking
};