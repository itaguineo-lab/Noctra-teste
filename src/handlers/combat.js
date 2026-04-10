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
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 10, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 10, '🟥', '⬛');

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ *BATALHA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}\n`;
    text += `[${playerBar}]\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ${fight.player.atk} • 🛡️ ${fight.player.def}\n\n`;

    text += `${getEnemyBadge(fight.enemy)}\n`;
    text += `👹 *${fight.enemy.name}*\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}\n`;
    text += `[${enemyBar}]\n\n`;

    text += `📜 *Últimas ações*\n`;
    text += fight.logs.slice(-4).join('\n');

    return text;
}

async function finishFight(ctx, fight) {
    const player = await getPlayer(ctx.from.id);
    updateEnergy(player);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);

        // Preserva o HP exato da luta
        player.hp = Math.max(1, Math.min(fight.player.hp, player.maxHp));
        player.energy = Math.min(fight.player.energy, player.maxEnergy);
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        // Construção da tela de vitória estilizada
        const { getXpToNextLevel } = require('../core/player/progression');
        const xpNeeded = getXpToNextLevel(player.level);
        const xpProgress = progressBar(player.xp, xpNeeded, 12, '🟨', '⬛');
        const hpBar = progressBar(player.hp, player.maxHp, 12, '🟥', '⬛');

        let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `         🏆 *VITÓRIA ÉPICA* 🏆\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        msg += `🎖️ *${player.name}*  •  Nível ${player.level}\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        msg += `✨ *Experiência*\n`;
        msg += `   +${rewards.xp} XP\n`;
        msg += `   ${player.xp}/${xpNeeded}  [${xpProgress}]\n\n`;

        msg += `💰 *Ouro*\n`;
        msg += `   +${rewards.gold} Ouro  |  Total: ${player.gold}\n\n`;

        msg += `❤️ *Vitalidade*\n`;
        msg += `   ${player.hp}/${player.maxHp}  [${hpBar}]\n`;
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

        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🌑 A escuridão recua... por enquanto.`;

        return safeEditMessage(ctx, msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        await savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        const msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `            💀 *DERROTA* 💀\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `Você foi derrotado...\n\n` +
                    `❤️ HP restaurado para ${player.hp}/${player.maxHp}\n` +
                    `⚡ Energia: ${player.energy}/${player.maxEnergy}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🌑 Reúna forças e tente novamente.`;

        return safeEditMessage(ctx, msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(1, fight.player.hp);
        await savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        const msg = `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🏃 *FUGA BEM-SUCEDIDA*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `Você escapou da batalha!\n\n` +
                    `❤️ HP atual: ${player.hp}/${player.maxHp}\n` +
                    `⚡ Energia restante: ${player.energy}/${player.maxEnergy}\n\n` +
                    `🌑 A escuridão te poupou... por enquanto.`;

        return safeEditMessage(ctx, msg, {
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

    // Salva o jogador com a energia consumida
    await savePlayer(ctx.from.id, player);

    // Recarrega o jogador para garantir stats atualizados (incluindo HP correto)
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

    activeFights.set(ctx.from.id, fight);

    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
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

    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
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

    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
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

        return safeEditMessage(ctx, renderFightText(fight, player), {
            parse_mode: 'Markdown',
            ...combatMenu()
        });
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

    return safeEditMessage(ctx, '💀 Escolha uma alma para usar:', {
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
        return handleSoulMenu(ctx);
    }

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
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
    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
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
