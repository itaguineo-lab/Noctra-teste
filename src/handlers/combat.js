const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { updateEnergy } = require('../services/energyService');
const { processVictory } = require('../services/rewardService');
const {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee,
    useSoul,
    applyDefend
} = require('../core/combat/combatEngine');
const { combatMenu, soulChoiceMenu, postCombatMenu } = require('../menus/combatMenu');
const { progressBar } = require('../utils/formatters');
const { getRandomEnemy } = require('../core/world/enemies');
const assets = require('../data/assets');
const {
    consumeEnergy,
    restoreEnergy,
    consumeConsumable,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const activeFights = new Map();
const FIGHT_TIMEOUT = 10 * 60 * 1000;

function getEnemyBadge(enemy) {
    if (enemy?.isBoss) return '👑 BOSS';
    if (enemy?.isMiniBoss) return '💀 MINI BOSS';
    if (enemy?.isElite) return '🔥 ELITE';
    return '👹 INIMIGO';
}

function getFight(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return null;

    if (Date.now() - fight.createdAt > FIGHT_TIMEOUT) {
        activeFights.delete(ctx.from.id);
        return null;
    }

    return fight;
}

function renderFightCaption(fight, player) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬛');

    let enemyStatusIcons = '';
    if (fight.enemy.poisonTurns > 0) enemyStatusIcons += '🧪';
    if (fight.enemy.bleedTurns > 0) enemyStatusIcons += '🩸';
    if (fight.enemy.shield > 0) enemyStatusIcons += '🛡️';
    if (fight.enemy.frozen) enemyStatusIcons += '❄️';

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
    text += fight.logs.slice(-4).join('\n');

    return text;
}

async function updateBattleMessage(ctx, fight, player, keyboard = null) {
    const caption = renderFightCaption(fight, player);
    const messageId = fight.battleMessageId;
    const chatId = ctx.chat.id;

    if (!messageId) return;

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
        } catch (secondError) {
            console.error('Erro ao editar mensagem de batalha:', secondError);

            const enemyImage = assets?.enemies?.[fight.enemy.id];
            if (enemyImage) {
                const sent = await ctx.replyWithPhoto(enemyImage, {
                    caption,
                    parse_mode: 'Markdown',
                    ...(keyboard || combatMenu())
                });
                fight.battleMessageId = sent.message_id;
                fight.isPhoto = true;
            } else {
                const sent = await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    ...(keyboard || combatMenu())
                });
                fight.battleMessageId = sent.message_id;
                fight.isPhoto = false;
            }
        }
    }
}

async function finishFight(ctx, fight) {
    const player = await getPlayer(ctx.from.id);
    updateEnergy(player);

    const chatId = ctx.chat.id;
    const messageId = fight.battleMessageId;
    const isPhoto = fight.isPhoto;

    const sendPostCombatFallback = async (msg) => {
        if (messageId) {
            try {
                await ctx.telegram.deleteMessage(chatId, messageId);
            } catch {}
        }

        await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    };

    activeFights.delete(ctx.from.id);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);

        player.hp = Math.max(1, Math.min(fight.player.hp, player.maxHp));
        player.energy = Math.min(fight.player.energy, player.maxEnergy);
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        const { getXpToNextLevel } = require('../core/player/progression');
        const xpNeeded = getXpToNextLevel(player.level);
        const xpProgress = progressBar(player.xp, xpNeeded, 6, '🟨', '⬛');

        let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `       🏆 *VITÓRIA ÉPICA* 🏆\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        msg += `🎖️ *${player.name}*  •  Nível ${player.level}\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        msg += `✨ *Experiência*\n`;
        msg += `   +${rewards.xp} XP\n`;
        msg += `   ${player.xp}/${xpNeeded}  ${xpProgress}\n\n`;

        msg += `💰 *Ouro*\n`;
        msg += `   +${rewards.gold} Ouro  |  Total: ${player.gold}\n\n`;

        msg += `❤️ *Vitalidade*\n`;
        msg += `   ${player.hp}/${player.maxHp}\n`;
        msg += `⚡ *Energia*: ${player.energy}/${player.maxEnergy}\n\n`;

        if (rewards.loot?.length) {
            msg += `🎁 *Loot Obtido*\n`;
            rewards.loot.forEach(item => {
                msg += `   ${item}\n`;
            });
            msg += `\n`;
        }

        if (rewards.leveledUp) {
            msg += `🌟 *LEVEL UP!* 🌟\n`;
            msg += `   Agora você é nível ${player.level}!\n\n`;
        }

        msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🌑 A escuridão recua... por enquanto.`;

        if (messageId) {
            try {
                if (isPhoto) {
                    await ctx.telegram.editMessageCaption(chatId, messageId, null, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: postCombatMenu().reply_markup
                    });
                } else {
                    await ctx.telegram.editMessageText(chatId, messageId, null, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: postCombatMenu().reply_markup
                    });
                }
            } catch {
                await sendPostCombatFallback(msg);
            }
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
        }

        return;
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        const msg = `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `          💀 *DERROTA* 💀\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Você foi derrotado...\n\n` +
            `❤️ HP restaurado para ${player.hp}/${player.maxHp}\n` +
            `⚡ Energia: ${player.energy}/${player.maxEnergy}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🌑 Reúna forças e tente novamente.`;

        if (messageId) {
            try {
                if (isPhoto) {
                    await ctx.telegram.editMessageCaption(chatId, messageId, null, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: postCombatMenu().reply_markup
                    });
                } else {
                    await ctx.telegram.editMessageText(chatId, messageId, null, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: postCombatMenu().reply_markup
                    });
                }
            } catch {
                await sendPostCombatFallback(msg);
            }
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
        }

        return;
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(1, fight.player.hp);
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        const msg = `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `      🏃 *FUGA BEM-SUCEDIDA*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Você escapou da batalha!\n\n` +
            `❤️ HP atual: ${player.hp}/${player.maxHp}\n` +
            `⚡ Energia restante: ${player.energy}/${player.maxEnergy}\n\n` +
            `🌑 A escuridão te poupou... por enquanto.`;

        if (messageId) {
            try {
                if (isPhoto) {
                    await ctx.telegram.editMessageCaption(chatId, messageId, null, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: postCombatMenu().reply_markup
                    });
                } else {
                    await ctx.telegram.editMessageText(chatId, messageId, null, msg, {
                        parse_mode: 'Markdown',
                        reply_markup: postCombatMenu().reply_markup
                    });
                }
            } catch {
                await sendPostCombatFallback(msg);
            }
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
        }
    }
}

async function handleHunt(ctx) {
    await ctx.answerCbQuery().catch(() => {});

    const player = await getPlayer(ctx.from.id);
    updateEnergy(player);

    if (player.energy < 1) {
        return ctx.reply('⚡ Sem energia.');
    }

    const enemy = getRandomEnemy(player.currentMap, player.level);
    if (!enemy) {
        return ctx.reply('❌ Nenhum inimigo neste mapa.');
    }

    if (!consumeEnergy(player, 1)) {
        return ctx.reply('⚡ Sem energia.');
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    const fight = createFight(player, enemy);
    fight.createdAt = Date.now();
    fight.battleMessageId = null;
    fight.isPhoto = false;

    activeFights.set(ctx.from.id, fight);

    const caption = renderFightCaption(fight, player);
    const enemyImage = assets?.enemies?.[enemy.id];

    try {
        await ctx.deleteMessage();
    } catch {}

    let sent;
    if (enemyImage) {
        sent = await ctx.replyWithPhoto(enemyImage, {
            caption,
            parse_mode: 'Markdown',
            ...combatMenu()
        });
        fight.isPhoto = true;
    } else {
        sent = await ctx.reply(caption, {
            parse_mode: 'Markdown',
            ...combatMenu()
        });
        fight.isPhoto = false;
    }

    fight.battleMessageId = sent.message_id;
}

async function handleAttack(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada. Inicie uma nova.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    processPlayerTurn(fight);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

async function handleDefend(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    applyDefend(fight);
    processEnemyTurn(fight);

    const player = await getPlayer(ctx.from.id);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

async function handleFlee(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    const success = attemptFlee(fight);
    if (success) {
        fight.status = 'fled';
        return finishFight(ctx, fight);
    }

    const player = await getPlayer(ctx.from.id);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

async function handleSoulMenu(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
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
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    const soulIndex = parseInt(ctx.match[1], 10);
    const result = useSoul(fight, soulIndex);

    if (!result) {
        await ctx.answerCbQuery('❌ Alma inválida ou vazia.', { show_alert: true }).catch(() => {});
        return;
    }

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

async function handleConsumables(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        await ctx.answerCbQuery('Use /start para criar seu personagem.', { show_alert: true }).catch(() => {});
        return;
    }

    const c = player.consumables || {};
    const rows = [];

    if ((c.potionHp || 0) > 0) rows.push([Markup.button.callback(`❤️ Poção HP (${c.potionHp})`, 'combat_use:potionHp')]);
    if ((c.potionEnergy || 0) > 0) rows.push([Markup.button.callback(`⚡ Poção Energia (${c.potionEnergy})`, 'combat_use:potionEnergy')]);
    if ((c.tonicStrength || 0) > 0) rows.push([Markup.button.callback(`💪 Tônico Força (${c.tonicStrength})`, 'combat_use:tonicStrength')]);
    if ((c.tonicDefense || 0) > 0) rows.push([Markup.button.callback(`🛡️ Tônico Defesa (${c.tonicDefense})`, 'combat_use:tonicDefense')]);
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
    const fight = getFight(ctx);

    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
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

    let log = '';

    if (key === 'potionHp') {
        const heal = Math.max(20, Math.floor(fight.player.maxHp * 0.4));
        const before = fight.player.hp;
        fight.player.hp = Math.min(fight.player.maxHp, fight.player.hp + heal);
        log = `❤️ Você recuperou ${fight.player.hp - before} HP com poção.`;
    } else if (key === 'potionEnergy') {
        const before = player.energy;
        restoreEnergy(player, 1);
        fight.player.energy = player.energy;
        log = `⚡ Energia +${player.energy - before} com poção.`;
    } else if (key === 'tonicStrength') {
        fight.player.atk += 10;
        log = '💪 ATK +10 para esta batalha.';
    } else if (key === 'tonicDefense') {
        fight.player.def += 10;
        log = '🛡️ DEF +10 para esta batalha.';
    } else {
        await ctx.answerCbQuery('❌ Consumível inválido.', { show_alert: true }).catch(() => {});
        return;
    }

    fight.logs.push(log);

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    await ctx.answerCbQuery('✅ Consumível usado!').catch(() => {});
    return updateBattleMessage(ctx, fight, player, combatMenu());
}

async function handleCombatBack(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    return updateBattleMessage(ctx, fight, player, combatMenu());
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
    finishFight,
    activeFights
};