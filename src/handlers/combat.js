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

async function safeEditMessage(ctx, text, options = {}) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery().catch(() => {});
                return await ctx.editMessageText(text, options);
            } else {
                return await ctx.reply(text, options);
            }
        } catch (error) {
            if (error.response?.error_code === 429) {
                const retryAfter = error.response.parameters?.retry_after || 5;
                console.log(`⏳ Rate limit atingido. Aguardando ${retryAfter}s...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                attempt++;
                continue;
            }
            console.error('Erro ao editar mensagem de combate:', error);
            try {
                return await ctx.reply(text, options);
            } catch (replyError) {
                console.error('Falha também ao enviar nova mensagem:', replyError);
                return null;
            }
        }
    }
    return ctx.reply(text, options).catch(() => null);
}

function renderFightText(fight, player) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬛');

    // Ícones de status do inimigo
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

async function sendOrUpdateFightPanel(ctx, fight, player) {
    const text = renderFightText(fight, player);
    const keyboard = fight.status === 'ongoing' ? combatMenu() : null;

    if (fight.panelMessageId) {
        try {
            return await ctx.telegram.editMessageText(
                ctx.chat.id,
                fight.panelMessageId,
                null,
                text,
                {
                    parse_mode: 'Markdown',
                    ...(keyboard ? keyboard : {})
                }
            );
        } catch (error) {
            console.log('Painel não pôde ser editado, recriando...');
        }
    }

    const sent = await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...(keyboard ? keyboard : {})
    });

    fight.panelMessageId = sent.message_id;
    return sent;
}

async function sendEnemyImageOnce(ctx, fight) {
    if (fight.enemyImageSent) return;

    const enemyImage = assets?.enemies?.[fight.enemy.id];
    if (!enemyImage) return;

    await ctx.replyWithPhoto(enemyImage, {
        caption: `${fight.enemy.emoji || '👹'} *${fight.enemy.name}*`,
        parse_mode: 'Markdown'
    });

    fight.enemyImageSent = true;
}

async function finishFight(ctx, fight) {
    const player = await getPlayer(ctx.from.id);
    updateEnergy(player);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);

        player.hp = Math.max(1, Math.min(fight.player.hp, player.maxHp));
        player.energy = Math.min(fight.player.energy, player.maxEnergy);
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

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

        // Remove o painel de combate e envia a mensagem de vitória
        try {
            if (fight.panelMessageId) {
                await ctx.telegram.deleteMessage(ctx.chat.id, fight.panelMessageId);
            }
        } catch (e) {
            // ignora
        }

        return ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        await savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        const msg = `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `          💀 *DERROTA* 💀\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `Você foi derrotado...\n\n` +
                    `❤️ HP restaurado para ${player.hp}/${player.maxHp}\n` +
                    `⚡ Energia: ${player.energy}/${player.maxEnergy}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🌑 Reúna forças e tente novamente.`;

        try {
            if (fight.panelMessageId) {
                await ctx.telegram.deleteMessage(ctx.chat.id, fight.panelMessageId);
            }
        } catch (e) {
            // ignora
        }

        return ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(1, fight.player.hp);
        await savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        const msg = `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `      🏃 *FUGA BEM-SUCEDIDA*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `Você escapou da batalha!\n\n` +
                    `❤️ HP atual: ${player.hp}/${player.maxHp}\n` +
                    `⚡ Energia restante: ${player.energy}/${player.maxEnergy}\n\n` +
                    `🌑 A escuridão te poupou... por enquanto.`;

        try {
            if (fight.panelMessageId) {
                await ctx.telegram.deleteMessage(ctx.chat.id, fight.panelMessageId);
            }
        } catch (e) {
            // ignora
        }

        return ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }
}

// ================================================
// HANDLER PRINCIPAL: /hunt (iniciar combate)
// ================================================

async function handleHunt(ctx) {
    await ctx.answerCbQuery().catch(() => {});

    let player = await getPlayer(ctx.from.id);
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
    fight.turnCount = 0;
    fight.totalDamageDealt = 0;
    fight.totalDamageReceived = 0;
    fight.enemyImageSent = false;
    fight.panelMessageId = null;

    activeFights.set(ctx.from.id, fight);

    await sendEnemyImageOnce(ctx, fight);
    return sendOrUpdateFightPanel(ctx, fight, player);
}

// ================================================
// HANDLER: Atacar (combat_attack)
// ================================================

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

    return sendOrUpdateFightPanel(ctx, fight, player);
}

// ================================================
// HANDLER: Defender (combat_defend)
// ================================================

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

    return sendOrUpdateFightPanel(ctx, fight, player);
}

// ================================================
// HANDLER: Fugir (combat_flee)
// ================================================

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
    } else {
        const player = await getPlayer(ctx.from.id);

        if (fight.status !== 'ongoing') {
            return finishFight(ctx, fight);
        }

        return sendOrUpdateFightPanel(ctx, fight, player);
    }
}

// ================================================
// HANDLER: Menu de Almas (combat_soul_menu)
// ================================================

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

    return ctx.reply('💀 Escolha uma alma para usar:', {
        parse_mode: 'Markdown',
        ...soulChoiceMenu()
    });
}

// ================================================
// HANDLER: Usar Alma (combat_soul_0 ou _1)
// ================================================

async function handleSoul(ctx) {
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

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return sendOrUpdateFightPanel(ctx, fight, player);
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
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.').catch(() => {});
        return handleHunt(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    return sendOrUpdateFightPanel(ctx, fight, player);
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