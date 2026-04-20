const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { updateEnergy } = require('../services/energyService');
const { processVictory } = require('../services/rewardService');
const { combatMenu, soulChoiceMenu, postCombatMenu } = require('../menus/combatMenu');
const { progressBar } = require('../utils/formatters');
const { getRandomEnemy } = require('../core/world/enemies');
const assets = require('../data/assets');
const { BALANCE } = require('../data/balance');

const {
    consumeEnergy,
    restoreEnergy,
    consumeConsumable,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    applyDeathXpPenalty
} = require('../core/player/progression');

const {
    createAndStoreFight,
    getStoredFight,
    persistFightMessage,
    removeStoredFight,
    runAttack,
    runDefend,
    runFlee,
    runSoul,
    runConsumableTurn
} = require('../core/combat/fightService');

const {
    updateMissionProgress
} = require('../core/daily/dailyService');

const {
    recordCombatStarted,
    recordCombatResult,
    recordConsumableUsed
} = require('../core/metrics/metricsService');

/*
=================================
HELPERS
=================================
*/

function getEnemyBadge(enemy) {
    if (enemy?.isBoss) return '👑 BOSS';
    if (enemy?.isMiniBoss) return '💀 MINI BOSS';
    if (enemy?.isElite) return '🔥 ELITE';
    return '👹 INIMIGO';
}

async function getFight(ctx) {
    return getStoredFight(ctx.from.id);
}

function clampPlayerBattleState(player, fight) {
    player.hp = Math.max(1, Math.min(fight.player.hp, player.maxHp));
    player.energy = Math.max(0, Math.min(fight.player.energy, player.maxEnergy));
    return player;
}

function buildEnemyStatusIcons(fight) {
    let icons = '';
    if (fight.enemy.poisonTurns > 0) icons += '🧪';
    if (fight.enemy.bleedTurns > 0) icons += '🩸';
    if (fight.enemy.shield > 0) icons += '🛡️';
    if (fight.enemy.frozen) icons += '❄️';
    return icons;
}

function renderFightCaption(fight, player) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬛');
    const enemyStatusIcons = buildEnemyStatusIcons(fight);

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ *BATALHA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}  ${playerBar}\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ${fight.player.atk} • 🛡️ ${fight.player.def}`;
    if (fight.player.defending) text += ` 🛡️`;
    if (fight.player.stunned) text += ` 💫`;
    text += `\n\n`;

    text += `${getEnemyBadge(fight.enemy)}\n`;
    text += `${fight.enemy.emoji || '👹'} *${fight.enemy.name}* [Lv ${fight.enemy.level}]`;
    if (enemyStatusIcons) text += ` ${enemyStatusIcons}`;
    text += `\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}  ${enemyBar}\n`;
    if (fight.enemy.shield > 0) text += `🛡️ Escudo: ${fight.enemy.shield}\n`;
    text += `⚔️ ${fight.enemy.atk} • 🛡️ ${fight.enemy.def} • 💥 ${fight.enemy.crit}%\n\n`;

    text += `📜 *Últimas ações*\n`;
    text += (fight.logs?.slice(-4).join('\n') || '—');

    return text;
}

async function sendNewBattleMessage(ctx, fight, keyboard = null) {
    const player = await getPlayer(ctx.from.id);
    const caption = renderFightCaption(fight, player);
    const enemyImage = assets?.enemies?.[fight.enemy.id];

    if (enemyImage) {
        const sent = await ctx.replyWithPhoto(enemyImage, {
            caption,
            parse_mode: 'Markdown',
            ...(keyboard || combatMenu())
        });

        await persistFightMessage(ctx.from.id, sent.message_id, true);
        return;
    }

    const sent = await ctx.reply(caption, {
        parse_mode: 'Markdown',
        ...(keyboard || combatMenu())
    });

    await persistFightMessage(ctx.from.id, sent.message_id, false);
}

async function updateBattleMessage(ctx, stored, player, keyboard = null) {
    const { fight, meta } = stored;
    const caption = renderFightCaption(fight, player);
    const messageId = meta.battleMessageId;
    const chatId = ctx.chat.id;

    if (!messageId) {
        return sendNewBattleMessage(ctx, fight, keyboard);
    }

    try {
        await ctx.telegram.editMessageCaption(chatId, messageId, null, caption, {
            parse_mode: 'Markdown',
            reply_markup: keyboard ? keyboard.reply_markup : undefined
        });
    } catch {
        try {
            await ctx.telegram.editMessageText(chatId, messageId, null, caption, {
                parse_mode: 'Markdown',
                reply_markup: keyboard ? keyboard.reply_markup : undefined
            });
        } catch (error) {
            console.error('Erro ao editar mensagem de batalha:', error);
            return sendNewBattleMessage(ctx, fight, keyboard);
        }
    }
}

async function sendPostCombatMessage(ctx, meta, message, keyboard) {
    const chatId = ctx.chat.id;
    const messageId = meta?.battleMessageId;
    const isPhoto = meta?.isPhoto;

    if (!messageId) {
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        return;
    }

    try {
        if (isPhoto) {
            await ctx.telegram.editMessageCaption(chatId, messageId, null, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        } else {
            await ctx.telegram.editMessageText(chatId, messageId, null, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        }
    } catch {
        try {
            await ctx.telegram.deleteMessage(chatId, messageId);
        } catch {}

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
}

/*
=================================
POST-COMBAT MESSAGES
=================================
*/

function buildVictoryMessage(player, rewards) {
    const { getXpToNextLevel } = require('../core/player/progression');
    const xpNeeded = getXpToNextLevel(player.level);
    const xpProgress = progressBar(player.xp, xpNeeded, 6, '🟨', '⬛');

    let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏆 *VITÓRIA*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `🎖️ *${player.name}* • Nível ${player.level}\n\n`;

    msg += `✨ *Experiência*\n`;
    msg += `+${rewards.xp} XP\n`;
    msg += `${player.xp}/${xpNeeded} ${xpProgress}\n\n`;

    msg += `💰 *Ouro*\n`;
    msg += `+${rewards.gold} Ouro | Total: ${player.gold}\n\n`;

    msg += `❤️ *Vitalidade*\n`;
    msg += `${player.hp}/${player.maxHp}\n`;
    msg += `⚡ Energia: ${player.energy}/${player.maxEnergy}\n\n`;

    if (rewards.loot?.length) {
        msg += `🎁 *Loot Obtido*\n`;
        rewards.loot.forEach(item => {
            msg += `${item}\n`;
        });
        msg += `\n`;
    }

    if (rewards.inventoryFull) {
        msg += `🎒 *Inventário cheio!* Um item deixou de entrar.\n\n`;
    }

    if (rewards.soulDropped && rewards.soulSource) {
        const sourceLabelMap = {
            field_boss: 'Boss de Campo',
            dungeon_boss: 'Boss de Masmorra',
            world_boss: 'World Boss',
            event_boss: 'Boss de Evento'
        };

        msg += `💀 *Alma obtida via ${sourceLabelMap[rewards.soulSource] || 'fonte rara'}*\n\n`;
    }

    if (rewards.keyDropped) {
        msg += `🗝️ *Chave de Masmorra obtida!*\n\n`;
    }

    if (rewards.leveledUp) {
        msg += `🌟 *LEVEL UP!*\n`;
        msg += `Agora você é nível ${player.level}!\n\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🌑 A escuridão recua... por enquanto.`;

    return msg;
}

function buildLossMessage(player, penalty) {
    return (
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💀 *DERROTA*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Você foi derrotado...\n\n` +
        `📉 XP perdido: ${penalty?.lostXp || 0}\n` +
        `✨ XP atual: ${player.xp}\n\n` +
        `❤️ HP restaurado para ${player.hp}/${player.maxHp}\n` +
        `⚡ Energia: ${player.energy}/${player.maxEnergy}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌑 Reúna forças e tente novamente.`
    );
}

function buildFleeMessage(player) {
    return (
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏃 *FUGA BEM-SUCEDIDA*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Você escapou da batalha!\n\n` +
        `❤️ HP atual: ${player.hp}/${player.maxHp}\n` +
        `⚡ Energia restante: ${player.energy}/${player.maxEnergy}\n\n` +
        `🌑 A escuridão te poupou... por enquanto.`
    );
}

/*
=================================
FIGHT RESOLUTION
=================================
*/

async function resolveExpiredFight(ctx) {
    await ctx.answerCbQuery('⚠️ Esta luta expirou. Caçe novamente se quiser.', {
        show_alert: true
    }).catch(() => {});

    try {
        await ctx.editMessageReplyMarkup(postCombatMenu().reply_markup);
    } catch {}

    return;
}

async function resolveWin(ctx, stored, player) {
    const { fight, meta } = stored;

    const rewards = await processVictory(player, fight.enemy);
    updateMissionProgress(player, 'kill', 1);

    clampPlayerBattleState(player, fight);
    normalizePlayerForSave(player);

    await savePlayer(ctx.from.id, player);
    await recordCombatResult('win');

    return sendPostCombatMessage(
        ctx,
        meta,
        buildVictoryMessage(player, rewards),
        postCombatMenu()
    );
}

async function resolveLoss(ctx, stored, player) {
    const { meta } = stored;

    const penalty = applyDeathXpPenalty(player, 0.05);
    player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));

    normalizePlayerForSave(player);

    await savePlayer(ctx.from.id, player);
    await recordCombatResult('loss');

    return sendPostCombatMessage(
        ctx,
        meta,
        buildLossMessage(player, penalty),
        postCombatMenu()
    );
}

async function resolveFlee(ctx, stored, player) {
    const { fight, meta } = stored;

    clampPlayerBattleState(player, fight);
    normalizePlayerForSave(player);

    await savePlayer(ctx.from.id, player);
    await recordCombatResult('fled');

    return sendPostCombatMessage(
        ctx,
        meta,
        buildFleeMessage(player),
        postCombatMenu()
    );
}

async function finishFight(ctx, stored) {
    const { fight } = stored;
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        await removeStoredFight(ctx.from.id);
        return ctx.reply('❌ Jogador não encontrado.');
    }

    updateEnergy(player);
    await removeStoredFight(ctx.from.id);

    if (fight.status === 'win') {
        return resolveWin(ctx, stored, player);
    }

    if (fight.status === 'loss') {
        return resolveLoss(ctx, stored, player);
    }

    if (fight.status === 'fled') {
        return resolveFlee(ctx, stored, player);
    }
}

/*
=================================
ENTRYPOINTS
=================================
*/

async function handleHunt(ctx) {
    await ctx.answerCbQuery().catch(() => {});

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return ctx.reply('🧭 Você ainda não criou um personagem. Use /start.');
    }

    updateEnergy(player);

    if (player.energy < BALANCE.energy.huntCost) {
        return ctx.reply('⚡ Sem energia.');
    }

    const enemy = getRandomEnemy(player.currentMap, player.level);
    if (!enemy) {
        return ctx.reply('❌ Nenhum inimigo neste mapa.');
    }

    if (!consumeEnergy(player, BALANCE.energy.huntCost)) {
        return ctx.reply('⚡ Sem energia.');
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    const fight = await createAndStoreFight(ctx.from.id, player, enemy);
    await recordCombatStarted();

    try {
        await ctx.deleteMessage();
    } catch {}

    return sendNewBattleMessage(ctx, fight, combatMenu());
}

async function handleAttack(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFight(ctx, stored);
    }

    const updated = await runAttack(ctx.from.id);
    const player = await getPlayer(ctx.from.id);

    if (!updated || updated.fight.status !== 'ongoing') {
        return finishFight(ctx, updated || stored);
    }

    await ctx.answerCbQuery().catch(() => {});
    return updateBattleMessage(ctx, updated, player, combatMenu());
}

async function handleDefend(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFight(ctx, stored);
    }

    const updated = await runDefend(ctx.from.id);
    const player = await getPlayer(ctx.from.id);

    if (!updated || updated.fight.status !== 'ongoing') {
        return finishFight(ctx, updated || stored);
    }

    await ctx.answerCbQuery().catch(() => {});
    return updateBattleMessage(ctx, updated, player, combatMenu());
}

async function handleFlee(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFight(ctx, stored);
    }

    const updated = await runFlee(ctx.from.id);
    if (!updated) {
        return resolveExpiredFight(ctx);
    }

    if (updated.success || updated.fight.status !== 'ongoing') {
        return finishFight(ctx, updated);
    }

    const player = await getPlayer(ctx.from.id);
    await ctx.answerCbQuery().catch(() => {});
    return updateBattleMessage(ctx, updated, player, combatMenu());
}

async function handleSoulMenu(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFight(ctx, stored);
    }

    const player = await getPlayer(ctx.from.id);
    const souls = player.soulsEquipped || [null, null];

    if (!souls[0] && !souls[1]) {
        await ctx.answerCbQuery('❌ Nenhuma alma equipada.', { show_alert: true }).catch(() => {});
        return;
    }

    try {
        await ctx.editMessageReplyMarkup(soulChoiceMenu().reply_markup);
    } catch {
        await ctx.reply('💀 Escolha uma alma:', soulChoiceMenu());
    }
}

async function handleSoul(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFight(ctx, stored);
    }

    const soulIndex = parseInt(ctx.match[1], 10);
    const updated = await runSoul(ctx.from.id, soulIndex);

    if (!updated || !updated.result) {
        await ctx.answerCbQuery('❌ Alma inválida ou vazia.', { show_alert: true }).catch(() => {});
        return;
    }

    const player = await getPlayer(ctx.from.id);

    if (updated.fight.status !== 'ongoing') {
        return finishFight(ctx, updated);
    }

    await ctx.answerCbQuery().catch(() => {});
    return updateBattleMessage(ctx, updated, player, combatMenu());
}

async function handleConsumables(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        await ctx.answerCbQuery('Use /start para criar seu personagem.', { show_alert: true }).catch(() => {});
        return;
    }

    const c = player.consumables || {};
    const rows = [];

    if ((c.potionHp || 0) > 0) {
        rows.push([Markup.button.callback(`❤️ Poção HP (${c.potionHp})`, 'combat_use:potionHp')]);
    }
    if ((c.potionEnergy || 0) > 0) {
        rows.push([Markup.button.callback(`⚡ Poção Energia (${c.potionEnergy})`, 'combat_use:potionEnergy')]);
    }
    if ((c.tonicStrength || 0) > 0) {
        rows.push([Markup.button.callback(`💪 Tônico Força (${c.tonicStrength})`, 'combat_use:tonicStrength')]);
    }
    if ((c.tonicDefense || 0) > 0) {
        rows.push([Markup.button.callback(`🛡️ Tônico Defesa (${c.tonicDefense})`, 'combat_use:tonicDefense')]);
    }

    rows.push([Markup.button.callback('◀️ Voltar', 'combat_back')]);

    if (rows.length === 1) {
        await ctx.answerCbQuery('❌ Você não possui consumíveis.', { show_alert: true }).catch(() => {});
        return;
    }

    try {
        await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(rows).reply_markup);
    } catch {
        await ctx.reply('🧪 Escolha um consumível:', Markup.inlineKeyboard(rows));
    }
}

async function handleUseConsumable(ctx) {
    const key = ctx.match?.[1];
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFight(ctx, stored);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        await ctx.answerCbQuery('Use /start para criar seu personagem.', { show_alert: true }).catch(() => {});
        return;
    }

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        await ctx.answerCbQuery('❌ Item indisponível.', { show_alert: true }).catch(() => {});
        return;
    }

    updateMissionProgress(player, 'use_consumable', 1);
    await recordConsumableUsed();

    const updated = await runConsumableTurn(ctx.from.id, (fight) => {
        let log = '';

        if (key === 'potionHp') {
            const healCfg = BALANCE.consumables.potionHp;
            const heal = Math.max(
                healCfg.minHealFlat,
                Math.floor(fight.player.maxHp * healCfg.combatHealPercent)
            );
            const before = fight.player.hp;
            fight.player.hp = Math.min(fight.player.maxHp, fight.player.hp + heal);
            log = `❤️ Você recuperou ${fight.player.hp - before} HP com poção.`;
        } else if (key === 'potionEnergy') {
            const before = player.energy;
            restoreEnergy(player, BALANCE.consumables.potionEnergy.restoreAmount);
            fight.player.energy = player.energy;
            log = `⚡ Energia +${player.energy - before} com poção.`;
        } else if (key === 'tonicStrength') {
            fight.player.atk += BALANCE.consumables.tonicStrength.atkBonus;
            log = `💪 ATK +${BALANCE.consumables.tonicStrength.atkBonus} para esta batalha.`;
        } else if (key === 'tonicDefense') {
            fight.player.def += BALANCE.consumables.tonicDefense.defBonus;
            log = `🛡️ DEF +${BALANCE.consumables.tonicDefense.defBonus} para esta batalha.`;
        } else {
            fight.logs.push('❌ Consumível inválido.');
            return { success: false };
        }

        fight.logs.push(log);
        return { success: true };
    });

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    if (!updated || updated.effectResult?.success === false) {
        await ctx.answerCbQuery('❌ Erro ao usar consumível.', { show_alert: true }).catch(() => {});
        return;
    }

    const refreshedPlayer = await getPlayer(ctx.from.id);

    if (updated.fight.status !== 'ongoing') {
        return finishFight(ctx, updated);
    }

    await ctx.answerCbQuery('✅ Consumível usado!').catch(() => {});
    return updateBattleMessage(ctx, updated, refreshedPlayer, combatMenu());
}

async function handleCombatBack(ctx) {
    const stored = await getFight(ctx);

    if (!stored) {
        return resolveExpiredFight(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    await ctx.answerCbQuery().catch(() => {});
    return updateBattleMessage(ctx, stored, player, combatMenu());
}

module.exports = {
    handleHunt,
    handleAttack,
    handleDefend,
    handleFlee,
    handleSoulMenu,
    handleSoul,
    handleConsumables,
    handleUseConsumable,
    handleCombatBack,
    finishFight
};