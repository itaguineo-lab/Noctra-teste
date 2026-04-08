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

function safeAnswer(
    ctx,
    text = undefined,
    options = {}
) {
    try {
        return ctx.answerCbQuery(
            text,
            options
        );
    } catch {
        return null;
    }
}

async function safeSend(
    ctx,
    text,
    options = {}
) {
    try {
        if (ctx.callbackQuery) {
            return await ctx.editMessageText(
                text,
                options
            );
        }

        return await ctx.reply(
            text,
            options
        );
    } catch {
        return await ctx.reply(
            text,
            options
        );
    }
}

function battleKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '⚔️ Atacar',
                'arena_attack'
            ),
            Markup.button.callback(
                '🛡️ Defender',
                'arena_defend'
            )
        ],
        [
            Markup.button.callback(
                '🏳️ Fugir',
                'arena_flee'
            )
        ],
        [
            Markup.button.callback(
                '🏠 Arena',
                'arena'
            )
        ]
    ]);
}

function hubKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '⚔️ Lutar',
                'arena_fight'
            )
        ],
        [
            Markup.button.callback(
                '🎁 Baús',
                'arena_chests'
            ),
            Markup.button.callback(
                '🏆 Ranking',
                'arena_ranking'
            )
        ],
        [
            Markup.button.callback(
                '🏪 Loja Arena',
                'arena_shop'
            )
        ],
        [
            Markup.button.callback(
                '🏠 Menu',
                'menu'
            )
        ]
    ]);
}

function getBattle(playerId) {
    const battle =
        activeArenaBattles.get(
            String(playerId)
        );

    if (!battle) return null;

    if (
        isBattleExpired(
            battle
        )
    ) {
        activeArenaBattles.delete(
            String(playerId)
        );

        return null;
    }

    return battle;
}

async function persistBattleHp(
    playerId,
    battle
) {
    const player =
        await getPlayer(
            playerId
        );

    ensureArenaState(player);

    player.hp = Math.max(
        1,
        Math.min(
            battle.player.hp,
            player.maxHp ||
                battle.player.hp
        )
    );

    await savePlayer(
        playerId,
        player
    );
}

/*
=================================
FINISH BATTLE
=================================
*/

async function finishBattle(
    ctx,
    battle,
    resultType
) {
    const player =
        await getPlayer(
            ctx.from.id
        );

    ensureArenaState(player);

    player.hp = Math.max(
        1,
        Math.min(
            battle.player.hp,
            player.maxHp ||
                battle.player.hp
        )
    );

    let summaryText = '';

    const keyboard =
        Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    '⚔️ Lutar de novo',
                    'arena_fight'
                )
            ],
            [
                Markup.button.callback(
                    '🎁 Baús',
                    'arena_chests'
                ),
                Markup.button.callback(
                    '🏆 Ranking',
                    'arena_ranking'
                )
            ],
            [
                Markup.button.callback(
                    '🏪 Loja',
                    'arena_shop'
                )
            ],
            [
                Markup.button.callback(
                    '🏠 Menu',
                    'menu'
                )
            ]
        ]);

    if (resultType === 'win') {
        const rewards =
            resolveArenaVictory(
                player,
                battle
            );

        summaryText =
            `🏆 *VITÓRIA NA ARENA*\n\n` +
            `🆚 ${battle.enemy.name}\n` +
            `🎯 +${rewards.pointsGained} pontos\n` +
            `🪙 +${rewards.coinsGained} moedas da arena\n`;

        if (
            rewards.chest
        ) {
            summaryText +=
                `🎁 ${rewards.chest.name}\n`;
        }

        if (
            rewards.leagueChanged
        ) {
            summaryText +=
                `\n⬆️ Nova liga!\n` +
                `${rewards.newLeague.emoji} ${rewards.newLeague.name}\n`;
        }
    }

    if (resultType === 'loss') {
        const rewards =
            resolveArenaLoss(
                player
            );

        summaryText =
            `💀 *DERROTA*\n\n` +
            `📉 -${rewards.pointsLost} pontos\n`;
    }

    if (resultType === 'fled') {
        const rewards =
            resolveArenaFlee(
                player
            );

        summaryText =
            `🏳️ *FUGA*\n\n` +
            `📉 -${rewards.pointsLost} pontos\n`;
    }

    await savePlayer(
        ctx.from.id,
        player
    );

    activeArenaBattles.delete(
        String(ctx.from.id)
    );

    return safeSend(
        ctx,
        summaryText,
        {
            parse_mode:
                'Markdown',
            ...keyboard
        }
    );
}

/*
=================================
ARENA HUB
=================================
*/

async function handleArena(ctx) {
    await safeAnswer(ctx);

    const player =
        await getPlayer(
            ctx.from.id,
            ctx.from.first_name
        );

    ensureArenaState(player);

    const battle =
        getBattle(
            ctx.from.id
        );

    if (battle) {
        return safeSend(
            ctx,
            buildArenaBattleText(
                battle
            ),
            {
                parse_mode:
                    'Markdown',
                ...battleKeyboard()
            }
        );
    }

    return safeSend(
        ctx,
        buildArenaHubText(
            player
        ),
        {
            parse_mode:
                'Markdown',
            ...hubKeyboard()
        }
    );
}

/*
=================================
START FIGHT
=================================
*/

async function handleArenaFight(
    ctx
) {
    await safeAnswer(ctx);

    const player =
        await getPlayer(
            ctx.from.id,
            ctx.from.first_name
        );

    ensureArenaState(player);

    const opponent =
        await selectArenaOpponentSnapshot(
            player
        );

    const playerSnapshot =
        snapshotArenaPlayer(
            player
        );

    const startingHp =
        Math.max(
            1,
            Math.min(
                player.hp ||
                    player.maxHp ||
                    1,
                player.maxHp || 1
            )
        );

    const battle =
        createArenaBattle(
            playerSnapshot,
            opponent,
            startingHp
        );

    activeArenaBattles.set(
        String(ctx.from.id),
        battle
    );

    return safeSend(
        ctx,
        buildArenaBattleText(
            battle
        ),
        {
            parse_mode:
                'Markdown',
            ...battleKeyboard()
        }
    );
}

/*
=================================
ATTACK
=================================
*/

async function handleArenaAttack(
    ctx
) {
    await safeAnswer(ctx);

    const battle =
        getBattle(
            ctx.from.id
        );

    if (!battle) {
        return handleArena(ctx);
    }

    const hit =
        calculateDamage(
            battle.player,
            battle.enemy
        );

    battle.enemy.hp =
        Math.max(
            0,
            battle.enemy.hp -
                hit.damage
        );

    battle.logs.push(
        `⚔️ Você causou ${hit.damage}`
    );

    if (
        battle.enemy.hp <= 0
    ) {
        return finishBattle(
            ctx,
            battle,
            'win'
        );
    }

    const enemyHit =
        calculateDamage(
            battle.enemy,
            battle.player
        );

    battle.player.hp =
        Math.max(
            0,
            battle.player.hp -
                enemyHit.damage
        );

    battle.logs.push(
        `👹 ${battle.enemy.name} causou ${enemyHit.damage}`
    );

    await persistBattleHp(
        ctx.from.id,
        battle
    );

    if (
        battle.player.hp <= 0
    ) {
        return finishBattle(
            ctx,
            battle,
            'loss'
        );
    }

    return safeSend(
        ctx,
        buildArenaBattleText(
            battle
        ),
        {
            parse_mode:
                'Markdown',
            ...battleKeyboard()
        }
    );
}

/*
=================================
DEFEND
=================================
*/

async function handleArenaDefend(
    ctx
) {
    await safeAnswer(ctx);

    const battle =
        getBattle(
            ctx.from.id
        );

    if (!battle) {
        return handleArena(ctx);
    }

    const enemyHit =
        calculateDamage(
            battle.enemy,
            battle.player,
            {
                multiplier: 0.5
            }
        );

    battle.player.hp =
        Math.max(
            0,
            battle.player.hp -
                enemyHit.damage
        );

    battle.logs.push(
        `🛡️ Defesa reduziu dano para ${enemyHit.damage}`
    );

    await persistBattleHp(
        ctx.from.id,
        battle
    );

    if (
        battle.player.hp <= 0
    ) {
        return finishBattle(
            ctx,
            battle,
            'loss'
        );
    }

    return safeSend(
        ctx,
        buildArenaBattleText(
            battle
        ),
        {
            parse_mode:
                'Markdown',
            ...battleKeyboard()
        }
    );
}

/*
=================================
FLEE
=================================
*/

async function handleArenaFlee(
    ctx
) {
    await safeAnswer(ctx);

    const battle =
        getBattle(
            ctx.from.id
        );

    if (!battle) {
        return handleArena(ctx);
    }

    return finishBattle(
        ctx,
        battle,
        'fled'
    );
}

/*
=================================
CHESTS
=================================
*/

async function handleArenaChests(
    ctx
) {
    await safeAnswer(ctx);

    const player =
        await getPlayer(
            ctx.from.id,
            ctx.from.first_name
        );

    ensureArenaState(player);

    const rows =
        player.arena.chests.map(
            chest => {
                const config =
                    getChestConfigSafe(
                        chest.tier
                    );

                const remaining =
                    getArenaChestRemainingText(
                        chest
                    );

                const label =
                    Date.now() >=
                    chest.readyAt
                        ? `🎁 ${config.name}`
                        : `⏳ ${config.name} (${remaining})`;

                return [
                    Markup.button.callback(
                        label,
                        `arena_open_chest:${chest.id}`
                    )
                ];
            }
        );

    rows.push([
        Markup.button.callback(
            '🏠 Arena',
            'arena'
        )
    ]);

    return safeSend(
        ctx,
        buildArenaChestListText(
            player
        ),
        {
            parse_mode:
                'Markdown',
            ...Markup.inlineKeyboard(
                rows
            )
        }
    );
}

/*
=================================
OPEN CHEST
=================================
*/

async function handleArenaOpenChest(
    ctx
) {
    await safeAnswer(ctx);

    const chestId =
        ctx.match?.[1];

    const player =
        await getPlayer(
            ctx.from.id
        );

    ensureArenaState(player);

    const result =
        openArenaChest(
            player,
            chestId
        );

    if (!result.success) {
        return safeAnswer(
            ctx,
            result.message,
            {
                show_alert: true
            }
        );
    }

    await savePlayer(
        ctx.from.id,
        player
    );

    let msg =
        `🎁 *BAÚ ABERTO*\n\n` +
        `🪙 +${result.rewards.arenaCoins}\n` +
        `💰 +${result.rewards.gold}\n`;

    return safeSend(
        ctx,
        msg,
        {
            parse_mode:
                'Markdown',
            ...hubKeyboard()
        }
    );
}

/*
=================================
RANKING
=================================
*/

async function handleArenaRanking(
    ctx
) {
    await safeAnswer(ctx);

    const playersMap =
        await getAllPlayers();

    return safeSend(
        ctx,
        buildArenaLeaderboardText(
            playersMap
        ),
        {
            parse_mode:
                'Markdown',
            ...hubKeyboard()
        }
    );
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