const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const {
    consumeEnergy
} = require('../services/energyService');

const {
    processVictory
} = require('../services/rewardService');

const {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee,
    useSoul
} = require('../core/combat/combatEngine');

const {
    combatMenu,
    postCombatMenu
} = require('../menus/combatMenu');

const {
    progressBar
} = require('../utils/formatters');

const {
    getRandomEnemy
} = require('../core/world/enemies');

const activeFights = new Map();

// Mensagens variadas de ataque
const attackMessages = {
    player: [
        '🗡️ Você golpeia com precisão',
        '💥 Seu ataque rasga o ar',
        '⚔️ Uma investida certeira',
        '🔥 Você desfere um golpe poderoso',
        '🌑 Sombras acompanham seu ataque'
    ],
    enemy: [
        '👹 O inimigo ataca ferozmente',
        '🌪️ A criatura golpeia com violência',
        '💀 A fera avança e causa dano',
        '🩸 O monstro crava suas garras'
    ]
};

function getRandomMessage(type) {
    const list = attackMessages[type] || attackMessages.player;
    return list[Math.floor(Math.random() * list.length)];
}

function renderFightText(fight, player) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟥', '⬜');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬜');

    let text = `⚔️ *BATALHA*\n\n`;
    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}\n`;
    text += `[${playerBar}]\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `🎯 CRIT ${fight.player.crit}%\n\n`;
    text += `👹 *${fight.enemy.name}* [Lv ${fight.enemy.level}]\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}\n`;
    text += `[${enemyBar}]\n\n`;
    text += `🎁 *Recompensas*\n`;
    text += `✨ ${fight.enemy.xp} XP\n`;
    text += `💰 ${fight.enemy.gold} ouro\n\n`;
    text += `📜 *Últimas ações*\n`;
    text += `${fight.logs.slice(-4).join('\n')}`;

    return text;
}

async function editMessage(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, options);
        } else {
            await ctx.reply(text, options);
        }
    } catch {
        await ctx.reply(text, options);
    }
}

async function finishFight(ctx, fight) {
    const player = getPlayer(ctx.from.id);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);
        player.hp = fight.player.hp;
        recalculateStats(player);
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        let msg = `🏆 *VITÓRIA!*\n\n✨ +${rewards.xp} XP\n💰 +${rewards.gold} Ouro`;
        if (rewards.loot.length) {
            msg += `\n\n🎁 ${rewards.loot.join('\n')}`;
        }
        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        return editMessage(ctx, `💀 *DERROTA*`, { parse_mode: 'Markdown', ...postCombatMenu() });
    }

    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        return editMessage(ctx, `🏃 *FUGIU*`, { parse_mode: 'Markdown', ...postCombatMenu() });
    }
}

async function handleHunt(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);
    if (player.energy < 1) {
        return ctx.reply('⚡ Sem energia.');
    }

    consumeEnergy(player, 1);
    savePlayer(ctx.from.id, player);

    const enemy = getRandomEnemy(player.currentMap, player.level);
    const fight = createFight(player, enemy);
    activeFights.set(ctx.from.id, fight);

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleAttack(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    const originalLog = fight.logs.length;
    processPlayerTurn(fight);

    // Mensagem variada
    if (fight.logs.length > originalLog) {
        const lastMsg = fight.logs[fight.logs.length - 1];
        if (lastMsg.includes('causou') && !lastMsg.includes('CRÍTICO')) {
            fight.logs[fight.logs.length - 1] = `${getRandomMessage('player')} e causou *${fight.lastDamageDealt}* dano!`;
        } else if (lastMsg.includes('CRÍTICO')) {
            fight.logs[fight.logs.length - 1] = `💥 CRÍTICO! ${getRandomMessage('player')} e causou *${fight.lastDamageDealt}* dano!`;
        }
    }

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
        if (fight.logs.length > originalLog + 1) {
            const enemyMsg = fight.logs[fight.logs.length - 1];
            if (enemyMsg.includes('causou') && !enemyMsg.includes('CRÍTICO')) {
                fight.logs[fight.logs.length - 1] = `${getRandomMessage('enemy')} e causou *${fight.lastDamageReceived}* dano!`;
            } else if (enemyMsg.includes('CRÍTICO')) {
                fight.logs[fight.logs.length - 1] = `💥 CRÍTICO! ${getRandomMessage('enemy')} e causou *${fight.lastDamageReceived}* dano!`;
            }
        }
    }

    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleSoul(ctx) {
    await ctx.answerCbQuery();

    // Extrai o índice da alma do callback (ex: combat_soul_0)
    const soulIndex = ctx.match?.[1] ? parseInt(ctx.match[1]) : 0;

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    useSoul(fight, soulIndex);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleConsumables(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};

    // Menu de escolha de consumível (simplificado: só poção de HP por enquanto)
    // Podemos expandir com mais opções depois
    if ((consumables.potionHp || 0) > 0) {
        consumables.potionHp -= 1;
        const heal = Math.floor(fight.player.maxHp * 0.4);
        fight.player.hp = Math.min(fight.player.maxHp, fight.player.hp + heal);
        fight.logs.push(`🧪 ${fight.player.name} usou uma poção e recuperou *${heal}* HP!`);
    } else if ((consumables.potionEnergy || 0) > 0) {
        consumables.potionEnergy -= 1;
        const energyGain = 10;
        fight.player.energy = Math.min(fight.player.maxEnergy, fight.player.energy + energyGain);
        fight.logs.push(`⚡ ${fight.player.name} usou uma poção de energia e recuperou *${energyGain}* energia!`);
    } else {
        return ctx.answerCbQuery('❌ Você não possui consumíveis.', { show_alert: true });
    }

    savePlayer(ctx.from.id, player);

    processEnemyTurn(fight);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleFlee(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    attemptFlee(fight);
    return finishFight(ctx, fight);
}

module.exports = {
    handleHunt,
    handleAttack,
    handleSoul,
    handleConsumables,
    handleFlee,
    activeFights
};