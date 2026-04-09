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

// Cache de lutas ativas (mesmo mapa usado no hunt)
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

async function editMessage(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return await ctx.editMessageText(text, options);
        }
        return await ctx.reply(text, options);
    } catch (error) {
        console.error('Erro ao editar mensagem de combate:', error);
        return await ctx.reply(text, options);
    }
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

        player.hp = Math.max(1, Math.min(fight.player.hp, player.maxHp));
        player.energy = Math.min(fight.player.energy, player.maxEnergy);
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        let msg = `🏆 *VITÓRIA*\n\n`;
        msg += `✨ +${rewards.xp} XP\n`;
        msg += `💰 +${rewards.gold} Ouro\n`;
        msg += `❤️ ${player.hp}/${player.maxHp}\n`;
        if (rewards.loot?.length) {
            msg += `\n🎁 *Loot:*\n${rewards.loot.join('\n')}`;
        }

        return editMessage(ctx, msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        await savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        return editMessage(ctx, `💀 *DERROTA*\n❤️ ${player.hp}/${player.maxHp}`, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(1, fight.player.hp);
        await savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        return editMessage(ctx, `🏃 *FUGA*\n❤️ ${player.hp}/${player.maxHp}`, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }
}

// ================================================
// HANDLER PRINCIPAL: /hunt (iniciar combate)
// ================================================

async function handleHunt(ctx) {
    await ctx.answerCbQuery();

    let player = await getPlayer(ctx.from.id);
    updateEnergy(player);

    if (player.energy < 1) {
        return ctx.reply('⚡ Sem energia.');
    }

    if (!consumeEnergy(player, 1)) {
        return ctx.reply('⚡ Sem energia.');
    }

    await savePlayer(ctx.from.id, player);
    player = await getPlayer(ctx.from.id); // recarrega stats atualizados

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

    return editMessage(ctx, renderFightText(fight, player), {
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
        await ctx.answerCbQuery('Luta expirada. Inicie uma nova.');
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    // Processa turno do jogador
    processPlayerTurn(fight);

    // Se o inimigo ainda estiver vivo, ele contra-ataca
    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);
    await savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    // Atualiza mensagem com o estado atual
    return editMessage(ctx, renderFightText(fight, player), {
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
        await ctx.answerCbQuery('Luta expirada.');
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    // Aplica postura defensiva (reduz dano recebido neste turno)
    applyDefend(fight);
    // Inimigo ataca (com dano reduzido)
    processEnemyTurn(fight);

    const player = await getPlayer(ctx.from.id);
    await savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(ctx, renderFightText(fight, player), {
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
        await ctx.answerCbQuery('Luta expirada.');
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
        // Falha na fuga: inimigo ataca (já processado no attemptFlee)
        const player = await getPlayer(ctx.from.id);
        await savePlayer(ctx.from.id, player);

        if (fight.status !== 'ongoing') {
            return finishFight(ctx, fight);
        }

        return editMessage(ctx, renderFightText(fight, player), {
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
        await ctx.answerCbQuery('Luta expirada.');
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    // Mostra menu de escolha de alma
    return editMessage(ctx, '💀 Escolha uma alma para usar:', {
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
        await ctx.answerCbQuery('Luta expirada.');
        return handleHunt(ctx);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    const match = ctx.match;
    const soulIndex = parseInt(match[1], 10);

    const result = useSoul(fight, soulIndex);
    if (!result) {
        await ctx.answerCbQuery('❌ Alma inválida ou vazia.', { show_alert: true });
        return handleSoulMenu(ctx);
    }

    // Após usar alma, inimigo contra-ataca
    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);
    await savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

// ================================================
// HANDLER: Consumíveis (combat_consumables)
// ================================================

async function handleConsumables(ctx) {
    // Placeholder: por enquanto apenas exibe mensagem informativa
    await ctx.answerCbQuery('🧪 Em breve: uso de poções durante o combate.', { show_alert: true });
}

// ================================================
// HANDLER: Voltar do menu de almas (combat_back)
// ================================================

async function handleCombatBack(ctx) {
    const fight = getFight(ctx);
    if (!fight) {
        await ctx.answerCbQuery('Luta expirada.');
        return handleHunt(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

// ================================================
// EXPORTAÇÕES
// ================================================

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