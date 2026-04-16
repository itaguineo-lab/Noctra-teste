const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    getAllPlayers
} = require('../core/player/playerService');

const {
    calculateDamage
} = require('../core/combat/damageCalc');

const {
    ensureArenaState,
    snapshotArenaPlayer,
    selectArenaOpponentSnapshot,
    createArenaBattle,
    isBattleExpired,
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
    restoreEnergy,
    consumeConsumable,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

/*
=================================
ACTIVE BATTLES
=================================
*/

const activeArenaBattles = new Map();

/*
=================================
HELPERS
=================================
*/

function getChestConfigSafe(tier) {
    return (
        ARENA_CHEST_CONFIG[tier] ||
        ARENA_CHEST_CONFIG.wood
    );
}

function safeAnswer(ctx, text = undefined, options = {}) {
    try {
        return ctx.answerCbQuery(text, options);
    } catch {
        return null;
    }
}

async function safeSend(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            return await ctx.editMessageText(text, options);
        }

        return await ctx.reply(text, options);
    } catch {
        return await ctx.reply(text, options);
    }
}

function battleKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Atacar', 'arena_attack'),
            Markup.button.callback('🛡️ Defender', 'arena_defend')
        ],
        [
            Markup.button.callback('🏳️ Fugir', 'arena_flee')
        ],
        [
            Markup.button.callback('🧪 Consumíveis', 'arena_consumables')
        ],
        [
            Markup.button.callback('🏠 Arena', 'arena')
        ]
    ]);
}

function hubKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Lutar', 'arena_fight')
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

function getBattle(playerId) {
    const battle = activeArenaBattles.get(String(playerId));

    if (!battle) return null;

    if (isBattleExpired(battle)) {
        activeArenaBattles.delete(String(playerId));
        return null;
    }

    return battle;
}

async function persistBattleHp(playerId, battle) {
    const player = await getPlayer(playerId);
    if (!player) return null;

    ensureArenaState(player);

    player.hp = Math.max(
        1,
        Math.min(
            battle.player.hp,
            player.maxHp || battle.player.hp
        )
    );

    normalizePlayerForSave(player);
    await savePlayer(playerId, player);
    return player;
}

async function finishBattle(ctx, battle, resultType) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        activeArenaBattles.delete(String(ctx.from.id));
        return safeSend(ctx, '❌ Jogador não encontrado.', {
            parse_mode: 'Markdown',
            ...hubKeyboard()
        });
    }

    ensureArenaState(player);

    player.hp = Math.max(
        1,
        Math.min(
            battle.player.hp,
            player.maxHp || battle.player.hp
        )
    );

    let summaryText = '';

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Lutar de novo', 'arena_fight')],
        [
            Markup.button.callback('🎁 Baús', 'arena_chests'),
            Markup.button.callback('🏆 Ranking', 'arena_ranking')
        ],
        [Markup.button.callback('🏪 Loja', 'arena_shop')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);

    if (resultType === 'win') {
        const rewards = resolveArenaVictory(player, battle);

        summaryText =
            `🏆 *VITÓRIA NA ARENA*\n\n` +
            `🆚 ${battle.enemy.name}\n` +
            `🎯 +${rewards.pointsGained} pontos\n` +
            `🪙 +${rewards.coinsGained} moedas da arena\n`;

        if (rewards.chest) {
            summaryText += `🎁 ${rewards.chest.name}\n`;
        }

        if (rewards.leagueChanged) {
            summaryText +=
                `\n⬆️ Nova liga!\n` +
                `${rewards.newLeague.emoji} ${rewards.newLeague.name}\n`;
        }
    }

    if (resultType === 'loss') {
        const rewards = resolveArenaLoss(player);

        summaryText =
            `💀 *DERROTA*\n\n` +
            `📉 -${rewards.pointsLost} pontos\n`;
    }

    if (resultType === 'fled') {
        const rewards = resolveArenaFlee(player);

        summaryText =
            `🏳️ *FUGA*\n\n` +
            `📉 -${rewards.pointsLost} pontos\n`;
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    activeArenaBattles.delete(String(ctx.from.id));

    return safeSend(ctx, summaryText, {
        parse_mode: 'Markdown',
        ...keyboard
    });
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
        return safeSend(ctx, '❌ Jogador não encontrado. Use /start.', {
            parse_mode: 'Markdown'
        });
    }

    ensureArenaState(player);

    const battle = getBattle(ctx.from.id);

    if (battle) {
        return safeSend(ctx, buildArenaBattleText(battle), {
            parse_mode: 'Markdown',
            ...battleKeyboard()
        });
    }

    return safeSend(ctx, buildArenaHubText(player), {
        parse_mode: 'Markdown',
        ...hubKeyboard()
    });
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
        return safeSend(ctx, '❌ Jogador não encontrado. Use /start.', {
            parse_mode: 'Markdown'
        });
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

    const battle = createArenaBattle(
        playerSnapshot,
        opponent,
        startingHp
    );

    activeArenaBattles.set(String(ctx.from.id), battle);

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

/*
=================================
ATTACK
=================================
*/

async function handleArenaAttack(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) {
        return handleArena(ctx);
    }

    const hit = calculateDamage(battle.player, battle.enemy);

    battle.enemy.hp = Math.max(
        0,
        battle.enemy.hp - hit.damage
    );

    battle.logs.push(`⚔️ Você causou ${hit.damage}`);

    if (battle.enemy.hp <= 0) {
        return finishBattle(ctx, battle, 'win');
    }

    const enemyHit = calculateDamage(battle.enemy, battle.player);

    battle.player.hp = Math.max(
        0,
        battle.player.hp - enemyHit.damage
    );

    battle.logs.push(`👹 ${battle.enemy.name} causou ${enemyHit.damage}`);

    await persistBattleHp(ctx.from.id, battle);

    if (battle.player.hp <= 0) {
        return finishBattle(ctx, battle, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

/*
=================================
DEFEND
=================================
*/

async function handleArenaDefend(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) {
        return handleArena(ctx);
    }

    const enemyHit = calculateDamage(battle.enemy, battle.player, {
        multiplier: 0.5
    });

    battle.player.hp = Math.max(
        0,
        battle.player.hp - enemyHit.damage
    );

    battle.logs.push(`🛡️ Defesa reduziu dano para ${enemyHit.damage}`);

    await persistBattleHp(ctx.from.id, battle);

    if (battle.player.hp <= 0) {
        return finishBattle(ctx, battle, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

/*
=================================
FLEE
=================================
*/

async function handleArenaFlee(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) {
        return handleArena(ctx);
    }

    return finishBattle(ctx, battle, 'fled');
}

/*
=================================
CONSUMABLES
=================================
*/

async function handleArenaConsumables(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) return handleArena(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.', {
            parse_mode: 'Markdown'
        });
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

    return safeSend(ctx, '🧪 *Consumíveis da Arena*\nEscolha um item:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(rows)
    });
}

async function handleArenaUseConsumable(ctx) {
    await safeAnswer(ctx);

    const key = ctx.match?.[1];
    const battle = getBattle(ctx.from.id);
    if (!battle) return handleArena(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.', {
            parse_mode: 'Markdown'
        });
    }

    ensureArenaState(player);
    player.consumables ??= {};

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        return safeAnswer(ctx, '❌ Item indisponível.', { show_alert: true });
    }

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
    } else {
        return safeAnswer(ctx, '❌ Consumível inválido.', { show_alert: true });
    }

    const enemyHit = calculateDamage(battle.enemy, battle.player);
    battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
    battle.logs.push(`👹 ${battle.enemy.name} respondeu com ${enemyHit.damage} de dano.`);

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await persistBattleHp(ctx.from.id, battle);

    if (battle.player.hp <= 0) {
        return finishBattle(ctx, battle, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
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
        return safeSend(ctx, '❌ Jogador não encontrado.', {
            parse_mode: 'Markdown'
        });
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

    rows.push([
        Markup.button.callback('🏠 Arena', 'arena')
    ]);

    return safeSend(ctx, buildArenaChestListText(player), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(rows)
    });
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
        return safeSend(ctx, '❌ Jogador não encontrado.', {
            parse_mode: 'Markdown'
        });
    }

    ensureArenaState(player);

    const result = openArenaChest(player, chestId);

    if (!result.success) {
        return safeAnswer(ctx, result.message, {
            show_alert: true
        });
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    let msg =
        `🎁 *BAÚ ABERTO*\n\n` +
        `🪙 +${result.rewards.arenaCoins}\n` +
        `💰 +${result.rewards.gold}\n`;

    return safeSend(ctx, msg, {
        parse_mode: 'Markdown',
        ...hubKeyboard()
    });
}

/*
=================================
RANKING
=================================
*/

async function handleArenaRanking(ctx) {
    await safeAnswer(ctx);

    const playersMap = await getAllPlayers();

    return safeSend(ctx, buildArenaLeaderboardText(playersMap), {
        parse_mode: 'Markdown',
        ...hubKeyboard()
    });
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