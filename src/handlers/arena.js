const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { calculateDamage } = require('../core/combat/damageCalc');

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
    resolveArenaFlee
} = require('../core/arena/arenaService');

const activeArenaBattles = new Map();

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
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

function chestsKeyboard(player) {
    const rows = [];

    player.arena.chests.forEach(chest => {
        const ready = Date.now() >= chest.readyAt;
        const label = ready
            ? `🎁 Abrir ${chest.emoji} ${chest.name}`
            : `⏳ ${chest.emoji} ${chest.name}`;

        rows.push([
            Markup.button.callback(label, `arena_open_chest:${chest.id}`)
        ]);
    });

    rows.push([
        Markup.button.callback('⚔️ Lutar', 'arena_fight'),
        Markup.button.callback('🏆 Ranking', 'arena_ranking')
    ]);

    rows.push([
        Markup.button.callback('🏠 Arena', 'arena')
    ]);

    return Markup.inlineKeyboard(rows);
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
    ensureArenaState(player);

    player.hp = Math.max(1, Math.min(battle.player.hp, player.maxHp || battle.player.hp));

    await savePlayer(playerId, player);
}

async function finishBattle(ctx, battle, resultType) {
    const player = await getPlayer(ctx.from.id);
    ensureArenaState(player);

    player.hp = Math.max(1, Math.min(battle.player.hp, player.maxHp || battle.player.hp));

    let summaryText = '';
    let keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Lutar de novo', 'arena_fight')
        ],
        [
            Markup.button.callback('🎁 Baús', 'arena_chests'),
            Markup.button.callback('🏆 Ranking', 'arena_ranking')
        ],
        [
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);

    if (resultType === 'win') {
        const rewards = resolveArenaVictory(player, battle);

        summaryText = `🏆 *VITÓRIA NA ARENA*\n\n`;
        summaryText += `🆚 ${battle.enemy.name}\n`;
        summaryText += `🎯 +${rewards.pointsGained} pontos\n`;
        summaryText += `🪙 +${rewards.coinsGained} moedas da arena\n`;

        if (rewards.chest) {
            const chestName = rewards.chest.name;
            summaryText += `🎁 Baú recebido: ${chestName}\n`;
        } else if (rewards.overflowCoins > 0) {
            summaryText += `✨ Conversão por limite de baús: +${rewards.overflowCoins} moedas da arena\n`;
        }

        if (rewards.leagueChanged) {
            summaryText += `\n⬆️ Promoção de liga!\n`;
            summaryText += `Agora você está em ${rewards.newLeague.emoji} ${rewards.newLeague.name}\n`;
        }
    }

    if (resultType === 'loss') {
        const rewards = resolveArenaLoss(player);

        summaryText = `💀 *DERROTA NA ARENA*\n\n`;
        summaryText += `🆚 ${battle.enemy.name}\n`;
        summaryText += `📉 -${rewards.pointsLost} pontos\n`;
        summaryText += `🔥 Sequência zerada\n`;
        summaryText += `❤️ HP restante: ${player.hp}/${player.maxHp}\n`;
    }

    if (resultType === 'fled') {
        const rewards = resolveArenaFlee(player);

        summaryText = `🏳️ *VOCÊ FUGIU*\n\n`;
        summaryText += `🆚 ${battle.enemy.name}\n`;
        summaryText += `📉 -${rewards.pointsLost} pontos\n`;
        summaryText += `🔥 Sequência zerada\n`;
    }

    await savePlayer(ctx.from.id, player);
    activeArenaBattles.delete(String(ctx.from.id));

    return safeSend(ctx, summaryText, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

async function handleArena(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id, ctx.from.first_name);
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

async function handleArenaFight(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id, ctx.from.first_name);
    ensureArenaState(player);

    const battle = getBattle(ctx.from.id);

    if (battle) {
        return safeSend(ctx, buildArenaBattleText(battle), {
            parse_mode: 'Markdown',
            ...battleKeyboard()
        });
    }

    const opponent = await selectArenaOpponentSnapshot(player);
    const playerSnapshot = snapshotArenaPlayer(player);

    const startingHp = Math.max(
        1,
        Math.min(player.hp || player.maxHp || 1, player.maxHp || 1)
    );

    const newBattle = createArenaBattle(playerSnapshot, opponent, startingHp);
    activeArenaBattles.set(String(ctx.from.id), newBattle);

    return safeSend(ctx, buildArenaBattleText(newBattle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

async function handleArenaAttack(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) {
        return safeSend(ctx, '⚠️ Nenhuma batalha ativa. Abra a arena novamente.', {
            parse_mode: 'Markdown',
            ...hubKeyboard()
        });
    }

    battle.turn += 1;

    const playerHit = calculateDamage(battle.player, battle.enemy);
    battle.enemy.hp = Math.max(0, battle.enemy.hp - playerHit.damage);
    battle.lastDamageDealt = playerHit.damage;
    battle.totalDamageDealt += playerHit.damage;

    battle.logs.push(
        playerHit.isCrit
            ? `💥 CRÍTICO! Você causou *${playerHit.damage}* de dano.`
            : `🗡️ Você causou *${playerHit.damage}* de dano.`
    );

    if (battle.enemy.hp <= 0) {
        battle.status = 'win';
        await persistBattleHp(ctx.from.id, battle);
        return finishBattle(ctx, battle, 'win');
    }

    const enemyMultiplier = battle.player.defending ? 0.5 : 1;
    const enemyHit = calculateDamage(battle.enemy, battle.player, { multiplier: enemyMultiplier });

    battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
    battle.lastDamageReceived = enemyHit.damage;
    battle.totalDamageReceived += enemyHit.damage;

    battle.logs.push(
        enemyHit.isCrit
            ? `💥 CRÍTICO! ${battle.enemy.name} causou *${enemyHit.damage}* de dano.`
            : `👹 ${battle.enemy.name} causou *${enemyHit.damage}* de dano.`
    );

    battle.player.defending = false;

    if (battle.player.hp <= 0) {
        battle.status = 'loss';
    }

    await persistBattleHp(ctx.from.id, battle);

    if (battle.status === 'loss') {
        return finishBattle(ctx, battle, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

async function handleArenaDefend(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) {
        return safeSend(ctx, '⚠️ Nenhuma batalha ativa. Abra a arena novamente.', {
            parse_mode: 'Markdown',
            ...hubKeyboard()
        });
    }

    battle.turn += 1;
    battle.player.defending = true;

    battle.logs.push(`🛡️ ${battle.player.name} se preparou para defender.`);

    const enemyHit = calculateDamage(battle.enemy, battle.player, { multiplier: 0.5 });

    battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
    battle.lastDamageReceived = enemyHit.damage;
    battle.totalDamageReceived += enemyHit.damage;

    battle.logs.push(
        enemyHit.isCrit
            ? `💥 CRÍTICO! ${battle.enemy.name} causou *${enemyHit.damage}* de dano.`
            : `👹 ${battle.enemy.name} causou *${enemyHit.damage}* de dano.`
    );

    battle.player.defending = false;

    if (battle.player.hp <= 0) {
        battle.status = 'loss';
    }

    await persistBattleHp(ctx.from.id, battle);

    if (battle.status === 'loss') {
        return finishBattle(ctx, battle, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

async function handleArenaFlee(ctx) {
    await safeAnswer(ctx);

    const battle = getBattle(ctx.from.id);
    if (!battle) {
        return safeSend(ctx, '⚠️ Nenhuma batalha ativa. Abra a arena novamente.', {
            parse_mode: 'Markdown',
            ...hubKeyboard()
        });
    }

    battle.turn += 1;

    const success = Math.random() < 0.65;

    if (success) {
        battle.status = 'fled';
        battle.logs.push('🏳️ Você fugiu da batalha.');
        await persistBattleHp(ctx.from.id, battle);
        return finishBattle(ctx, battle, 'fled');
    }

    battle.logs.push('🚫 A fuga falhou.');

    const enemyHit = calculateDamage(battle.enemy, battle.player);
    battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
    battle.lastDamageReceived = enemyHit.damage;
    battle.totalDamageReceived += enemyHit.damage;

    battle.logs.push(
        enemyHit.isCrit
            ? `💥 CRÍTICO! ${battle.enemy.name} causou *${enemyHit.damage}* de dano.`
            : `👹 ${battle.enemy.name} causou *${enemyHit.damage}* de dano.`
    );

    if (battle.player.hp <= 0) {
        battle.status = 'loss';
    }

    await persistBattleHp(ctx.from.id, battle);

    if (battle.status === 'loss') {
        return finishBattle(ctx, battle, 'loss');
    }

    return safeSend(ctx, buildArenaBattleText(battle), {
        parse_mode: 'Markdown',
        ...battleKeyboard()
    });
}

async function handleArenaChests(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id, ctx.from.first_name);
    ensureArenaState(player);

    if (!player.arena.chests.length) {
        return safeSend(ctx, buildArenaChestListText(player), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚔️ Lutar', 'arena_fight')],
                [Markup.button.callback('🏠 Arena', 'arena')]
            ])
        });
    }

    const rows = player.arena.chests.map(chest => {
        const config = getChestConfigSafe(chest.tier);
        const remaining = getArenaChestRemainingText(chest);
        const label = Date.now() >= chest.readyAt
            ? `🎁 Abrir ${config.emoji} ${config.name}`
            : `⏳ ${config.emoji} ${config.name} (${remaining})`;

        return [Markup.button.callback(label, `arena_open_chest:${chest.id}`)];
    });

    rows.push([
        Markup.button.callback('⚔️ Lutar', 'arena_fight'),
        Markup.button.callback('🏠 Arena', 'arena')
    ]);

    return safeSend(ctx, buildArenaChestListText(player), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(rows)
    });
}

async function handleArenaOpenChest(ctx) {
    await safeAnswer(ctx);

    const chestId = ctx.match?.[1];
    if (!chestId) {
        return safeAnswer(ctx, '❌ Baú inválido.', { show_alert: true });
    }

    const player = await getPlayer(ctx.from.id, ctx.from.first_name);
    ensureArenaState(player);

    const result = openArenaChest(player, chestId);

    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await savePlayer(ctx.from.id, player);

    const { chest, rewards } = result;
    const config = getChestConfigSafe(chest.tier);

    let msg = `🎁 *${config.name} aberto!*\n\n`;
    msg += `🪙 +${rewards.arenaCoins} moedas da arena\n`;
    msg += `💰 +${rewards.gold} ouro\n`;

    if (rewards.keys > 0) {
        msg += `🗝️ +${rewards.keys} chave(s)\n`;
    }

    if (rewards.glorias > 0) {
        msg += `🏅 +${rewards.glorias} glória(s)\n`;
    }

    if (rewards.consumable) {
        msg += `🧪 +1 ${rewards.consumable}\n`;
    }

    return safeSend(ctx, msg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎁 Mais baús', 'arena_chests')],
            [Markup.button.callback('⚔️ Lutar', 'arena_fight')],
            [Markup.button.callback('🏠 Arena', 'arena')]
        ])
    });
}

function getChestConfigSafe(tier) {
    const { ARENA_CHEST_CONFIG } = require('../core/arena/arenaService');
    return ARENA_CHEST_CONFIG[tier] || ARENA_CHEST_CONFIG.wood;
}

async function handleArenaRanking(ctx) {
    await safeAnswer(ctx);

    const playersMap = require('../core/player/playerService').getAllPlayers
        ? await require('../core/player/playerService').getAllPlayers()
        : {};

    const text = buildArenaLeaderboardText(playersMap, 10);

    return safeSend(ctx, text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⚔️ Lutar', 'arena_fight')],
            [Markup.button.callback('🎁 Baús', 'arena_chests')],
            [Markup.button.callback('🏠 Arena', 'arena')]
        ])
    });
}

module.exports = {
    handleArena,
    handleArenaFight,
    handleArenaAttack,
    handleArenaDefend,
    handleArenaFlee,
    handleArenaChests,
    handleArenaOpenChest,
    handleArenaRanking
};