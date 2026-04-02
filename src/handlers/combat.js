const {
    getPlayer,
    savePlayer,
    recalculateStats,
    updateBuffs
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
    useSoul,
    applyDefend
} = require('../core/combat/combatEngine');

const {
    combatMenu,
    soulChoiceMenu,
    postCombatMenu
} = require('../menus/combatMenu');

const {
    progressBar,
    formatNumber
} = require('../utils/formatters');

const {
    getRandomEnemy
} = require('../core/world/enemies');

const { Markup } = require('telegraf');

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

function renderBuffs(buffs) {
    if (!buffs || buffs.length === 0) return '';
    let text = '';
    buffs.forEach(buff => {
        if (buff.type === 'atk') text += `💪 ATK +${buff.value} (${buff.remainingTurns}) `;
        if (buff.type === 'def') text += `🛡️ DEF +${buff.value} (${buff.remainingTurns}) `;
    });
    return text.trim();
}

function renderFightText(fight, player) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟥', '⬜');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬜');
    const buffsText = renderBuffs(fight.player.buffs);

    let text = `⚔️ *BATALHA*\n\n`;
    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}\n`;
    text += `[${playerBar}]\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `🎯 CRIT ${fight.player.crit}%\n`;
    if (fight.player.defending) text += `🛡️ *Defendendo* (dano reduzido 50%)\n`;
    if (buffsText) text += `✨ Buffs: ${buffsText}\n`;
    
    const soul1 = fight.player.souls[0] ? fight.player.souls[0].name : 'vazio';
    const soul2 = fight.player.souls[1] ? fight.player.souls[1].name : 'vazio';
    text += `💀 Almas: [${soul1}] | [${soul2}]\n`;
    
    text += `\n👹 *${fight.enemy.name}* [Lv ${fight.enemy.level}]\n`;
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

async function finishFight(ctx, fight, turnCount, damageDealt, damageReceived) {
    const player = getPlayer(ctx.from.id);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);
        player.hp = fight.player.hp;
        player.energy = fight.player.energy;
        recalculateStats(player);
        updateBuffs(player);
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        // Verifica se houve level up
        const oldLevel = player.level - (rewards.leveledUp ? 1 : 0);
        const xpNeeded = oldLevel ? Math.floor(100 * Math.pow(oldLevel, 1.2)) : 0;
        const xpProgress = oldLevel ? Math.floor((player.xp / xpNeeded) * 100) : 0;

        let msg = `╔════════════════════════╗\n`;
        msg += `║     🏆 *VITÓRIA!*      ║\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ 👤 Inimigo: ${fight.enemy.name}\n`;
        msg += `║ ⚔️ Turnos: ${turnCount}\n`;
        msg += `║ 💥 Dano causado: ${damageDealt}\n`;
        msg += `║ 🛡️ Dano recebido: ${damageReceived}\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ ✨ +${rewards.xp} XP\n`;
        msg += `║ 💰 +${rewards.gold} Ouro\n`;
        if (rewards.loot.length) {
            msg += `║ 🎁 ${rewards.loot.join('\n║ 🎁 ')}\n`;
        }
        if (rewards.leveledUp) {
            msg += `╠════════════════════════╣\n`;
            msg += `║ 🌟 *LEVEL UP!* Nv ${oldLevel} → ${player.level}\n`;
            msg += `║ ❤️ HP: ${player.maxHp} (+${player.maxHp - (oldLevel? player.maxHp - 20 : 0)})\n`;
            msg += `║ ⚔️ ATK: ${player.atk}  🛡️ DEF: ${player.def}\n`;
        } else {
            msg += `╠════════════════════════╣\n`;
            msg += `║ 📊 Progresso: ${xpProgress}% para próximo nível\n`;
        }
        msg += `╚════════════════════════╝`;

        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    }

    if (fight.status === 'loss') {
        const penaltyHp = Math.max(1, Math.floor(player.maxHp * 0.25));
        player.hp = penaltyHp;
        updateBuffs(player);
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        let msg = `╔════════════════════════╗\n`;
        msg += `║     💀 *DERROTA*       ║\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ Você foi abatido por...\n`;
        msg += `║ 👹 ${fight.enemy.name}\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ ⚔️ Turnos: ${turnCount}\n`;
        msg += `║ 💥 Dano causado: ${damageDealt}\n`;
        msg += `║ 🛡️ Dano recebido: ${damageReceived}\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ ⚡ -1 energia (penalidade)\n`;
        msg += `║ ❤️ HP restante: ${Math.floor((penaltyHp / player.maxHp) * 100)}%\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ 🏃‍♂️ Fuja ou recupere-se!\n`;
        msg += `╚════════════════════════╝`;

        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    }

    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        player.energy = fight.player.energy;
        updateBuffs(player);
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        let msg = `╔════════════════════════╗\n`;
        msg += `║     🏃 *FUGIU*         ║\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ Você escapou com vida!\n`;
        msg += `║ 👹 ${fight.enemy.name} ficou para trás.\n`;
        msg += `╠════════════════════════╣\n`;
        msg += `║ ❤️ HP: ${player.hp}/${player.maxHp}\n`;
        msg += `║ ⚡ Energia: ${player.energy}/${player.maxEnergy}\n`;
        msg += `╚════════════════════════╝`;

        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
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
    fight.player.buffs = [...(player.buffs || [])];
    fight.player.defending = false;
    fight.turnCount = 0;
    fight.totalDamageDealt = 0;
    fight.totalDamageReceived = 0;
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
    fight.turnCount++;
    processPlayerTurn(fight);
    fight.totalDamageDealt += fight.lastDamageDealt;

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
        fight.totalDamageReceived += fight.lastDamageReceived;
        if (fight.logs.length > originalLog + 1) {
            const enemyMsg = fight.logs[fight.logs.length - 1];
            if (enemyMsg.includes('causou') && !enemyMsg.includes('CRÍTICO')) {
                fight.logs[fight.logs.length - 1] = `${getRandomMessage('enemy')} e causou *${fight.lastDamageReceived}* dano!`;
            } else if (enemyMsg.includes('CRÍTICO')) {
                fight.logs[fight.logs.length - 1] = `💥 CRÍTICO! ${getRandomMessage('enemy')} e causou *${fight.lastDamageReceived}* dano!`;
            }
        }
    }

    fight.player.defending = false;

    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    player.energy = fight.player.energy;
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleDefend(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    fight.turnCount++;
    applyDefend(fight);
    fight.logs.push(`🛡️ ${fight.player.name} se prepara para defender!`);

    processEnemyTurn(fight);
    fight.totalDamageReceived += fight.lastDamageReceived;
    fight.player.defending = false;

    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    player.energy = fight.player.energy;
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleSoulMenu(ctx) {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    const hasSoul = fight.player.souls.some(s => s !== null);
    if (!hasSoul) {
        await ctx.answerCbQuery('❌ Você não tem nenhuma alma equipada!', { show_alert: true });
        const player = getPlayer(ctx.from.id);
        return editMessage(ctx, renderFightText(fight, player), {
            parse_mode: 'Markdown',
            ...combatMenu()
        });
    }

    await ctx.editMessageText('💀 *Escolha qual alma usar:*', {
        parse_mode: 'Markdown',
        ...soulChoiceMenu()
    });
}

async function handleSoul(ctx) {
    await ctx.answerCbQuery();

    const soulIndex = ctx.match?.[1] ? parseInt(ctx.match[1]) : 0;
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    const soul = fight.player.souls[soulIndex];
    if (!soul) {
        await ctx.answerCbQuery('❌ Nenhuma alma equipada neste slot.', { show_alert: true });
        const player = getPlayer(ctx.from.id);
        return editMessage(ctx, renderFightText(fight, player), {
            parse_mode: 'Markdown',
            ...combatMenu()
        });
    }

    fight.turnCount++;
    useSoul(fight, soulIndex);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
        fight.totalDamageReceived += fight.lastDamageReceived;
    }

    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    player.energy = fight.player.energy;
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }

    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function showConsumableMenu(ctx) {
    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};
    const keyboard = [];

    if (consumables.potionHp > 0) {
        keyboard.push([Markup.button.callback(`❤️ Poção de Vida (${consumables.potionHp})`, 'use_potion_hp')]);
    }
    if (consumables.potionEnergy > 0) {
        keyboard.push([Markup.button.callback(`⚡ Poção de Energia (${consumables.potionEnergy})`, 'use_potion_energy')]);
    }
    if (consumables.tonicStrength > 0) {
        keyboard.push([Markup.button.callback(`💪 Tônico de Força (${consumables.tonicStrength})`, 'use_tonic_strength')]);
    }
    if (consumables.tonicDefense > 0) {
        keyboard.push([Markup.button.callback(`🛡️ Tônico de Defesa (${consumables.tonicDefense})`, 'use_tonic_defense')]);
    }
    if (keyboard.length === 0) {
        keyboard.push([Markup.button.callback('❌ Nenhum consumível', 'noop')]);
    }
    keyboard.push([Markup.button.callback('◀️ Voltar', 'combat_back')]);

    await ctx.editMessageText('🧪 *Escolha um consumível:*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
    });
}

async function useConsumable(ctx, type) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};

    let success = false;

    switch (type) {
        case 'potion_hp':
            if (consumables.potionHp > 0) {
                consumables.potionHp--;
                const heal = Math.floor(fight.player.maxHp * 0.4);
                fight.player.hp = Math.min(fight.player.maxHp, fight.player.hp + heal);
                fight.logs.push(`🧪 ${fight.player.name} usou uma poção e recuperou *${heal}* HP!`);
                success = true;
            }
            break;
        case 'potion_energy':
            if (consumables.potionEnergy > 0) {
                consumables.potionEnergy--;
                const energyGain = 10;
                fight.player.energy = Math.min(fight.player.maxEnergy, fight.player.energy + energyGain);
                fight.logs.push(`⚡ ${fight.player.name} usou uma poção de energia e recuperou *${energyGain}* energia!`);
                success = true;
            }
            break;
        case 'tonic_strength':
            if (consumables.tonicStrength > 0) {
                consumables.tonicStrength--;
                const buff = { type: 'atk', value: 10, remainingTurns: 3 };
                player.buffs.push(buff);
                fight.player.buffs.push(buff);
                fight.logs.push(`💪 ${fight.player.name} usou um tônico de força! +10 ATK por 3 turnos.`);
                success = true;
            }
            break;
        case 'tonic_defense':
            if (consumables.tonicDefense > 0) {
                consumables.tonicDefense--;
                const buff = { type: 'def', value: 10, remainingTurns: 3 };
                player.buffs.push(buff);
                fight.player.buffs.push(buff);
                fight.logs.push(`🛡️ ${fight.player.name} usou um tônico de defesa! +10 DEF por 3 turnos.`);
                success = true;
            }
            break;
    }

    if (!success) {
        await ctx.answerCbQuery('❌ Você não possui este consumível.', { show_alert: true });
        return showConsumableMenu(ctx);
    }

    savePlayer(ctx.from.id, player);

    fight.turnCount++;
    processEnemyTurn(fight);
    fight.totalDamageReceived += fight.lastDamageReceived;

    const playerUpdated = getPlayer(ctx.from.id);
    playerUpdated.hp = fight.player.hp;
    playerUpdated.energy = fight.player.energy;
    savePlayer(ctx.from.id, playerUpdated);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }

    return editMessage(ctx, renderFightText(fight, playerUpdated), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleConsumables(ctx) {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    await showConsumableMenu(ctx);
}

async function handleFlee(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    fight.turnCount++;
    attemptFlee(fight);
    return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
}

async function handleCombatBack(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    const player = getPlayer(ctx.from.id);
    return editMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

module.exports = {
    handleHunt,
    handleAttack,
    handleDefend,
    handleSoulMenu,
    handleSoul,
    handleConsumables,
    handleFlee,
    handleCombatBack,
    useConsumable,
    activeFights
};