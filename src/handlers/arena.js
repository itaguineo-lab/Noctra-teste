const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer,
    getAllPlayers,
    getPlayerCollection
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

const { BALANCE } = require('../data/balance');

const ARENA_BATTLE_KEYBOARD = Markup.inlineKeyboard([
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

const ARENA_HUB_KEYBOARD = Markup.inlineKeyboard([
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

const ARENA_RESULT_KEYBOARD = Markup.inlineKeyboard([
    [Markup.button.callback('⚔️ Lutar de novo', 'arena_fight')],
    [
        Markup.button.callback('🎁 Baús', 'arena_chests'),
        Markup.button.callback('🏆 Ranking', 'arena_ranking')
    ],
    [Markup.button.callback('🏪 Loja Arena', 'arena_shop')],
    [Markup.button.callback('🏠 Menu', 'menu')]
]);

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

async function getBattle(userId) {
    return getStoredArenaBattle(userId);
}

async function persistBattleHp(playerId, battle) {
    if (!battle?.player) return null;

    const collection = await getPlayerCollection();
    await collection.updateOne(
        { id: String(playerId) },
        {
            $set: {
                hp: Math.max(1, Number(battle.player.hp || 1)),
                updatedAt: new Date()
            }
        }
    );

    return true;
}

function getArenaPotionHeal(maxHp) {
    return Math.max(
        BALANCE.consumables.potionHp.dungeonMinHealFlat,
        Math.floor(maxHp * BALANCE.consumables.potionHp.dungeonHealPercent)
    );
}

function getArenaStrengthBonus() {
    return Math.max(1, BALANCE.consumables.tonicStrength.dungeonAtkBonus);
}

function getArenaDefenseBonus() {
    return Math.max(1, BALANCE.consumables.tonicDefense.dungeonDefBonus);
}

async function finishBattle(ctx, stored, resultType) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        await removeStoredArenaBattle(ctx.from.id);
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
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

        summaryText += `\nA arena reconhece consistência e força.`;
    }

    if (resultType === 'loss') {
        const rewards = resolveArenaLoss(player);

        summaryText =
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💀 *DERROTA NA ARENA*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🆚 Adversário: *${battle.enemy.name}*\n` +
            `📉 Pontos perdidos: -${rewards.pointsLost}\n\n` +
            `A arena pune erros. Ajuste sua build e volte mais forte.`;
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

    return safeSend(ctx, summaryText, ARENA_RESULT_KEYBOARD);
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
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
    }

    ensureArenaState(player);

    const stored = await getBattle(ctx.from.id);
    if (stored?.battle) {
        return safeSend(ctx, buildArenaBattleText(stored.battle), ARENA_BATTLE_KEYBOARD);
    }

    let hubText = buildArenaHubText(player);
    hubText += `\n\n🎯 *Objetivo*\n`;
    hubText += `Suba de liga, conquiste baús e acumule moedas da arena sem quebrar sua economia principal.`;

    return safeSend(ctx, hubText, ARENA_HUB_KEYBOARD);
}

/*
=================================
START FIGHT
=================================
*/

async function handleArenaFight(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
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

    await safeAnswer(ctx);

    const introText =
        `🏟️ *DESAFIO DA ARENA*\n\n` +
        `Você encontrou um novo adversário.\n\n` +
        buildArenaBattleText(battle);

    const sent = await safeSend(ctx, introText, ARENA_BATTLE_KEYBOARD);

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

    const updated = await runArenaAttack(ctx.from.id, stored);
    if (!updated) {
        return handleArena(ctx);
    }

    await persistBattleHp(ctx.from.id, updated.battle);

    if (updated.battle.status === 'win') {
        return finishBattle(ctx, updated, 'win');
    }

    if (updated.battle.status === 'loss') {
        return finishBattle(ctx, updated, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(updated.battle), ARENA_BATTLE_KEYBOARD);
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

    const updated = await runArenaDefend(ctx.from.id, stored);
    if (!updated) {
        return handleArena(ctx);
    }

    await persistBattleHp(ctx.from.id, updated.battle);

    if (updated.battle.status === 'loss') {
        return finishBattle(ctx, updated, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(updated.battle), ARENA_BATTLE_KEYBOARD);
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

    const updated = await runArenaFlee(ctx.from.id, stored);
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
    const stored = await getBattle(ctx.from.id);
    if (!stored?.battle) return handleArena(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
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

    await safeAnswer(ctx);

    return safeSend(
        ctx,
        `🧪 *Consumíveis da Arena*\n\nEscolha um item para obter vantagem tática, não para distorcer o meta.`,
        Markup.inlineKeyboard(rows)
    );
}

async function handleArenaUseConsumable(ctx) {
    const key = ctx.match?.[1];
    const stored = await getBattle(ctx.from.id);
    if (!stored?.battle) return handleArena(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
    }

    ensureArenaState(player);
    player.consumables ??= {};

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        return safeAnswer(ctx, '❌ Item indisponível.', { show_alert: true });
    }

    await safeAnswer(ctx);

    const updated = await runArenaConsumable(ctx.from.id, (battle) => {
        if (key === 'potionHp') {
            const heal = getArenaPotionHeal(battle.player.maxHp);
            battle.player.hp = Math.min(battle.player.maxHp, battle.player.hp + heal);
            battle.logs.push(`❤️ Você usou ${BALANCE.consumables.potionHp.label} e se curou.`);
        } else if (key === 'potionEnergy') {
            restoreEnergy(player, BALANCE.consumables.potionEnergy.restoreAmount);
            battle.logs.push(`⚡ Energia +${BALANCE.consumables.potionEnergy.restoreAmount} com ${BALANCE.consumables.potionEnergy.label}.`);
        } else if (key === 'tonicStrength') {
            const atkBonus = getArenaStrengthBonus();
            battle.player.atk += atkBonus;
            battle.logs.push(`💪 ${BALANCE.consumables.tonicStrength.label}: ATK +${atkBonus}.`);
        } else if (key === 'tonicDefense') {
            const defBonus = getArenaDefenseBonus();
            battle.player.def += defBonus;
            battle.logs.push(`🛡️ ${BALANCE.consumables.tonicDefense.label}: DEF +${defBonus}.`);
        }
    }, stored);

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await persistBattleHp(ctx.from.id, updated.battle);

    if (updated.battle.status === 'loss') {
        return finishBattle(ctx, updated, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(updated.battle), ARENA_BATTLE_KEYBOARD);
}

/*
=================================
CHESTS
=================================
*/

async function handleArenaChests(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
    }

    ensureArenaState(player);
    await safeAnswer(ctx);

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
    text += `\n\n🎁 *Baús da Arena*\nAbra seus baús para converter vitórias em progresso competitivo moderado.`;

    return safeSend(ctx, text, Markup.inlineKeyboard(rows));
}

/*
=================================
OPEN CHEST
=================================
*/

async function handleArenaOpenChest(ctx) {
    const chestId = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
    }

    ensureArenaState(player);

    const result = openArenaChest(player, chestId);

    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await safeAnswer(ctx);

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

    return safeSend(ctx, msg, ARENA_HUB_KEYBOARD);
}

/*
=================================
RANKING
=================================
*/

async function handleArenaRanking(ctx) {
    await safeAnswer(ctx);

    const players = await getAllPlayers();
    let text = buildArenaLeaderboardText(players);
    text += `\n\n🏆 *Ranking Competitivo*\nSuba de liga, vença mais e dispute prestígio real.`;

    return safeSend(ctx, text, ARENA_HUB_KEYBOARD);
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