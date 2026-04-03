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
    useSoul,
    applyDefend
} = require('../core/combat/combatEngine');

const {
    combatMenu,
    soulChoiceMenu,
    postCombatMenu
} = require('../menus/combatMenu');

const {
    progressBar
} = require('../utils/formatters');

const {
    getRandomEnemy
} = require('../core/world/enemies');

const { Markup } = require('telegraf');
const { checkMissionProgress } = require('./daily'); // <-- ADICIONADO

const activeFights = new Map();

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
        const turns = Math.max(0, Number(buff.remainingTurns) || 0);
        if (buff.type === 'atk') text += `💪 ATK +${buff.value} (${turns}) `;
        if (buff.type === 'def') text += `🛡️ DEF +${buff.value} (${turns}) `;
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
    text += `💀 Almas: [${soul1}] | [${soul2}]\n\n`;

    text += `👹 *${fight.enemy.name}* [Lv ${fight.enemy.level}]\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}\n`;
    text += `[${enemyBar}]\n\n`;
    text += `🎁 *Recompensas*\n✨ ${fight.enemy.xp} XP\n💰 ${fight.enemy.gold} ouro\n\n`;
    text += `📜 *Últimas ações*\n${fight.logs.slice(-4).join('\n')}`;

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

function syncFightBuffsToPlayer(playerId, fight) {
    const player = getPlayer(playerId);
    player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
    savePlayer(playerId, player);
    return player;
}

function tickFightBuffs(playerId, fight) {
    if (!fight.player.buffs || !fight.player.buffs.length) return;
    fight.player.buffs = fight.player.buffs
        .map(buff => ({ ...buff, remainingTurns: Math.max(0, (Number(buff.remainingTurns) || 0) - 1) }))
        .filter(buff => buff.remainingTurns > 0);
    syncFightBuffsToPlayer(playerId, fight);
}

async function finishFight(ctx, fight, turnCount, damageDealt, damageReceived) {
    const player = getPlayer(ctx.from.id);

    if (fight.status === 'win') {
        const beforeStats = {
            level: player.level,
            atk: player.atk,
            def: player.def,
            maxHp: player.maxHp
        };

        const rewards = processVictory(player, fight.enemy);
        player.hp = Math.min(fight.player.hp, player.maxHp);
        player.energy = Math.min(fight.player.energy, player.maxEnergy);
        player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];

        recalculateStats(player);
        player.hp = Math.min(player.hp, player.maxHp);
        player.energy = Math.min(player.energy, player.maxEnergy);

        // Atualiza missão de kill
        checkMissionProgress(player, 'kill', 1);

        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        const oldLevel = beforeStats.level;
        const levelUpText = rewards.leveledUp
            ? `╠════════════════════════╣\n║ 🌟 *LEVEL UP!* Nv ${oldLevel} → ${player.level}\n║ ❤️ HP: ${beforeStats.maxHp} → ${player.maxHp}\n║ ⚔️ ATK: ${beforeStats.atk} → ${player.atk}\n║ 🛡️ DEF: ${beforeStats.def} → ${player.def}\n`
            : '';

        const xpNeeded = Math.floor(100 * Math.pow(player.level, 1.2));
        const xpProgress = xpNeeded > 0 ? Math.floor((player.xp / xpNeeded) * 100) : 0;

        let msg = `╔════════════════════════╗\n║     🏆 *VITÓRIA!*      ║\n╠════════════════════════╣\n║ 👤 Inimigo: ${fight.enemy.name}\n║ ⚔️ Turnos: ${turnCount}\n║ 💥 Dano causado: ${damageDealt}\n║ 🛡️ Dano recebido: ${damageReceived}\n╠════════════════════════╣\n║ ✨ +${rewards.xp} XP\n║ 💰 +${rewards.gold} Ouro\n`;
        if (rewards.loot.length) {
            msg += `║ 🎁 ${rewards.loot.join('\n║ 🎁 ')}\n`;
        }
        if (rewards.leveledUp) {
            msg += levelUpText;
        } else {
            msg += `╠════════════════════════╣\n║ 📊 Progresso: ${xpProgress}% para próximo nível\n`;
        }
        msg += `╚════════════════════════╝`;

        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    }

    if (fight.status === 'loss') {
        const penaltyHp = Math.max(1, Math.floor(player.maxHp * 0.25));
        const penaltyEnergy = Math.max(0, (player.energy || 0) - 1);
        player.hp = penaltyHp;
        player.energy = penaltyEnergy;
        player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        const hpPercent = Math.floor((penaltyHp / player.maxHp) * 100);
        let msg = `╔════════════════════════╗\n║     💀 *DERROTA*       ║\n╠════════════════════════╣\n║ Você foi abatido por...\n║ 👹 ${fight.enemy.name}\n╠════════════════════════╣\n║ ⚔️ Turnos: ${turnCount}\n║ 💥 Dano causado: ${damageDealt}\n║ 🛡️ Dano recebido: ${damageReceived}\n╠════════════════════════╣\n║ ⚡ -1 energia (penalidade)\n║ ❤️ HP restante: ${hpPercent}%\n╠════════════════════════╣\n║ 🏃‍♂️ Fuja ou recupere-se!\n╚════════════════════════╝`;
        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    }

    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        player.energy = fight.player.energy;
        player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        let msg = `╔════════════════════════╗\n║     🏃 *FUGIU*         ║\n╠════════════════════════╣\n║ Você escapou com vida!\n║ 👹 ${fight.enemy.name} ficou para trás.\n╠════════════════════════╣\n║ ❤️ HP: ${player.hp}/${player.maxHp}\n║ ⚡ Energia: ${player.energy}/${player.maxEnergy}\n╚════════════════════════╝`;
        return editMessage(ctx, msg, { parse_mode: 'Markdown', ...postCombatMenu() });
    }
}

async function handleHunt(ctx) {
    await ctx.answerCbQuery();
    const player = getPlayer(ctx.from.id);
    if (player.energy < 1) return ctx.reply('⚡ Sem energia.');
    const enemy = getRandomEnemy(player.currentMap, player.level);
    if (!enemy) return ctx.reply('❌ Nenhum inimigo disponível neste mapa.');
    if (!consumeEnergy(player, 1)) return ctx.reply('⚡ Sem energia.');
    savePlayer(ctx.from.id, player);

    const fight = createFight(player, enemy);
    fight.player.buffs = Array.isArray(player.buffs) ? player.buffs.map(buff => ({ ...buff })) : [];
    fight.player.defending = false;
    fight.turnCount = 0;
    fight.totalDamageDealt = 0;
    fight.totalDamageReceived = 0;
    activeFights.set(ctx.from.id, fight);

    return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
}

async function handleAttack(ctx) {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    tickFightBuffs(ctx.from.id, fight);
    fight.turnCount++;
    processPlayerTurn(fight);
    fight.totalDamageDealt += fight.lastDamageDealt;

    // Atualiza logs com mensagens personalizadas
    if (fight.logs.length > 0) {
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
        if (fight.logs.length > 0) {
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
    player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }
    return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
}

async function handleDefend(ctx) {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    tickFightBuffs(ctx.from.id, fight);
    fight.turnCount++;
    applyDefend(fight);
    fight.logs.push(`🛡️ ${fight.player.name} se prepara para defender!`);
    processEnemyTurn(fight);
    fight.totalDamageReceived += fight.lastDamageReceived;
    fight.player.defending = false;
    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    player.energy = fight.player.energy;
    player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
    savePlayer(ctx.from.id, player);
    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }
    return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
}

async function handleSoulMenu(ctx) {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    const hasSoul = fight.player.souls.some(s => s !== null);
    if (!hasSoul) {
        await ctx.answerCbQuery('❌ Você não tem nenhuma alma equipada!', { show_alert: true });
        const player = getPlayer(ctx.from.id);
        return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
    }
    await ctx.editMessageText('💀 *Escolha qual alma usar:*', { parse_mode: 'Markdown', ...soulChoiceMenu() });
}

async function handleSoul(ctx) {
    await ctx.answerCbQuery();
    const soulIndex = ctx.match?.[1] ? parseInt(ctx.match[1], 10) : 0;
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    const soul = fight.player.souls[soulIndex];
    if (!soul) {
        await ctx.answerCbQuery('❌ Nenhuma alma equipada neste slot.', { show_alert: true });
        const player = getPlayer(ctx.from.id);
        return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
    }
    tickFightBuffs(ctx.from.id, fight);
    fight.turnCount++;
    useSoul(fight, soulIndex);
    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
        fight.totalDamageReceived += fight.lastDamageReceived;
    }
    const player = getPlayer(ctx.from.id);
    player.hp = fight.player.hp;
    player.energy = fight.player.energy;
    player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
    savePlayer(ctx.from.id, player);
    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }
    return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
}

async function showConsumableMenu(ctx) {
    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};
    const keyboard = [];
    if (consumables.potionHp > 0) keyboard.push([Markup.button.callback(`❤️ Poção de Vida (${consumables.potionHp})`, 'use_potion_hp')]);
    if (consumables.potionEnergy > 0) keyboard.push([Markup.button.callback(`⚡ Poção de Energia (${consumables.potionEnergy})`, 'use_potion_energy')]);
    if (consumables.tonicStrength > 0) keyboard.push([Markup.button.callback(`💪 Tônico de Força (${consumables.tonicStrength})`, 'use_tonic_strength')]);
    if (consumables.tonicDefense > 0) keyboard.push([Markup.button.callback(`🛡️ Tônico de Defesa (${consumables.tonicDefense})`, 'use_tonic_defense')]);
    if (keyboard.length === 0) keyboard.push([Markup.button.callback('❌ Nenhum consumível', 'noop')]);
    keyboard.push([Markup.button.callback('◀️ Voltar', 'combat_back')]);
    await ctx.editMessageText('🧪 *Escolha um consumível:*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

async function useConsumable(ctx, type) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};
    let success = false;
    tickFightBuffs(ctx.from.id, fight);

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
                fight.player.buffs.push({ ...buff });
                fight.logs.push(`💪 ${fight.player.name} usou um tônico de força! +10 ATK por 3 turnos.`);
                success = true;
            }
            break;
        case 'tonic_defense':
            if (consumables.tonicDefense > 0) {
                consumables.tonicDefense--;
                const buff = { type: 'def', value: 10, remainingTurns: 3 };
                fight.player.buffs.push({ ...buff });
                fight.logs.push(`🛡️ ${fight.player.name} usou um tônico de defesa! +10 DEF por 3 turnos.`);
                success = true;
            }
            break;
    }

    if (!success) {
        await ctx.answerCbQuery('❌ Você não possui este consumível.', { show_alert: true });
        return showConsumableMenu(ctx);
    }

    player.consumables = consumables;
    player.hp = fight.player.hp;
    player.energy = fight.player.energy;
    player.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
    savePlayer(ctx.from.id, player);
    fight.turnCount++;

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
        fight.totalDamageReceived += fight.lastDamageReceived;
    }

    const playerUpdated = getPlayer(ctx.from.id);
    playerUpdated.hp = fight.player.hp;
    playerUpdated.energy = fight.player.energy;
    playerUpdated.buffs = Array.isArray(fight.player.buffs) ? fight.player.buffs.map(buff => ({ ...buff })) : [];
    savePlayer(ctx.from.id, playerUpdated);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
    }
    return editMessage(ctx, renderFightText(fight, playerUpdated), { parse_mode: 'Markdown', ...combatMenu() });
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
    tickFightBuffs(ctx.from.id, fight);
    fight.turnCount++;
    attemptFlee(fight);
    return finishFight(ctx, fight, fight.turnCount, fight.totalDamageDealt, fight.totalDamageReceived);
}

async function handleCombatBack(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;
    const player = getPlayer(ctx.from.id);
    return editMessage(ctx, renderFightText(fight, player), { parse_mode: 'Markdown', ...combatMenu() });
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