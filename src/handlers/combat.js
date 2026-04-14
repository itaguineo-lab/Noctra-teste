const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { consumeEnergy, updateEnergy } = require('../services/energyService');
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

// Cache de lutas ativas
const activeFights = new Map();
const FIGHT_TIMEOUT = 10 * 60 * 1000; // 10 minutos

// ================================================
// FUNÇÕES AUXILIARES
// ================================================

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

function renderFightCaption(fight, player, extraLine = '') {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '�05', '⬛');

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

    if (extraLine) {
        text += `\n\n${extraLine}`;
    }

    return text;
}

async function updateBattleMessage(ctx, fight, player, keyboard = null, extraLine = '') {
    const caption = renderFightCaption(fight, player, extraLine);
    const messageId = fight.battleMessageId;
    const chatId = ctx.chat.id;

    if (!messageId) return;

    try {
        await ctx.telegram.editMessageCaption(chatId, messageId, null, caption, {
            parse_mode: 'Markdown',
            reply_markup: keyboard ? keyboard.reply_markup : undefined
        });
    } catch (error) {
        console.error('Erro ao editar legenda da batalha:', error);
        // Fallback: recria a mensagem (apenas se realmente necessário)
        const enemyImage = assets?.enemies?.[fight.enemy.id];
        if (enemyImage) {
            const sent = await ctx.replyWithPhoto(enemyImage, {
                caption,
                parse_mode: 'Markdown',
                ...(keyboard || combatMenu())
            });
            fight.battleMessageId = sent.message_id;
        } else {
            const sent = await ctx.reply(caption, {
                parse_mode: 'Markdown',
                ...(keyboard || combatMenu())
            });
            fight.battleMessageId = sent.message_id;
        }
    }
}

async function finishFight(ctx, fight) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        activeFights.delete(ctx.from.id);
        return ctx.reply('❌ Sessão expirada.');
    }

    updateEnergy(player);
    const chatId = ctx.chat.id;
    const messageId = fight.battleMessageId;

    activeFights.delete(ctx.from.id);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);

        player.hp = Math.max(1, Math.min(fight.player.hp, player.maxHp));
        player.energy = Math.min(fight.player.energy, player.maxEnergy);
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
            rewards.loot.forEach(item => msg += `   ${item}\n`);
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
                await ctx.telegram.editMessageCaption(chatId, messageId, null, msg, {
                    parse_mode: 'Markdown',
                    reply_markup: postCombatMenu().reply_markup
                });
            } catch (e) {
                await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
            }
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
        }
        return;
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
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
                await ctx.telegram.editMessageCaption(chatId, messageId, null, msg, {
                    parse_mode: 'Markdown',
                    reply_markup: postCombatMenu().reply_markup
                });
            } catch (e) {
                await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
            }
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
        }
        return;
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(1, fight.player.hp);
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
                await ctx.telegram.editMessageCaption(chatId, messageId, null, msg, {
                    parse_mode: 'Markdown',
                    reply_markup: postCombatMenu().reply_markup
                });
            } catch (e) {
                await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
            }
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', ...postCombatMenu() });
        }
        return;
    }
}

// ================================================
// HANDLER PRINCIPAL: /hunt
// ================================================

async function handleHunt(ctx) {
    await ctx.answerCbQuery().catch(() => {});

    let player = await getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Perfil não encontrado. Use /start.');

    updateEnergy(player);

    if (player.energy < 1) {
        return ctx.reply('⚡ Sem energia.');
    }

    if (!consumeEnergy(player, 1)) {
        return ctx.reply('⚡ Sem energia.');
    }

    await savePlayer(ctx.from.id, player);
    player = await getPlayer(ctx.from.id);

    const enemy = getRandomEnemy(player.currentMap, player.level);
    if (!enemy) {
        return ctx.reply('❌ Nenhum inimigo neste mapa.');
    }

    const fight = createFight(player, enemy);
    fight.createdAt = Date.now();
    fight.battleMessageId = null;

    activeFights.set(ctx.from.id, fight);

    const caption = renderFightCaption(fight, player);
    const enemyImage = assets?.enemies?.[enemy.id];

    // Deleta APENAS se o callback veio do menu principal (identificado por um parâmetro opcional)
    // Como não temos isso ainda, comentamos a deleção para evitar comportamento indesejado.
    // try {
    //     await ctx.deleteMessage();
    // } catch (e) {
    //     // ignora
    // }

    let sent;
    if (enemyImage) {
        sent = await ctx.replyWithPhoto(enemyImage, {
            caption,
            parse_mode: 'Markdown',
            ...combatMenu()
        });
    } else {
        sent = await ctx.reply(caption, {
            parse_mode: 'Markdown',
            ...combatMenu()
        });
    }

    fight.battleMessageId = sent.message_id;
}

// ================================================
// HANDLER: Atacar (combat_attack)
// ================================================

async function handleAttack(ctx) {
    await ctx.answerCbQuery('⚔️ Atacando...').catch(() => {});
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
    if (!player) return ctx.reply('❌ Sessão expirada.');

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

// ================================================
// HANDLER: Defender (combat_defend)
// ================================================

async function handleDefend(ctx) {
    await ctx.answerCbQuery('🛡️ Defendendo...').catch(() => {});
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
    if (!player) return ctx.reply('❌ Sessão expirada.');

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

// ================================================
// HANDLER: Fugir (combat_flee)
// ================================================

async function handleFlee(ctx) {
    await ctx.answerCbQuery('🏃 Tentando fugir...').catch(() => {});
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
    } else {
        const player = await getPlayer(ctx.from.id);
        if (!player) return ctx.reply('❌ Sessão expirada.');

        if (fight.status !== 'ongoing') {
            return finishFight(ctx, fight);
        }

        return updateBattleMessage(ctx, fight, player, combatMenu());
    }
}

// ================================================
// HANDLER: Menu de Almas (combat_soul_menu)
// ================================================

async function handleSoulMenu(ctx) {
    await ctx.answerCbQuery().catch(() => {});
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Sessão expirada.');

    const souls = player.soulsEquipped || [null, null];
    if (!souls[0] && !souls[1]) {
        await ctx.answerCbQuery('❌ Nenhuma alma equipada.', { show_alert: true }).catch(() => {});
        return;
    }

    // Atualiza a legenda com uma mensagem temporária e troca o teclado
    try {
        await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, fight.battleMessageId, null, soulChoiceMenu().reply_markup);
    } catch (e) {
        await ctx.reply('💀 Escolha uma alma:', soulChoiceMenu());
    }
}

// ================================================
// HANDLER: Usar Alma (combat_soul_0 ou _1)
// ================================================

async function handleSoul(ctx) {
    await ctx.answerCbQuery('💀 Usando alma...').catch(() => {});
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    const match = ctx.match;
    const soulIndex = parseInt(match[1], 10);

    const result = useSoul(fight, soulIndex);
    if (!result) {
        await ctx.answerCbQuery('❌ Alma inválida ou vazia.', { show_alert: true }).catch(() => {});
        return;
    }

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Sessão expirada.');

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return updateBattleMessage(ctx, fight, player, combatMenu());
}

// ================================================
// HANDLER: Consumíveis (combat_consumables)
// ================================================

async function handleConsumables(ctx) {
    await ctx.answerCbQuery('🧪 Em breve: uso de poções durante o combate.', { show_alert: true }).catch(() => {});
}

// ================================================
// HANDLER: Voltar do menu de almas (combat_back)
// ================================================

async function handleCombatBack(ctx) {
    await ctx.answerCbQuery().catch(() => {});
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Sessão expirada.');

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
    handleCombatBack,
    finishFight,
    activeFights
};