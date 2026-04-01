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

function renderFightText(fight, player) {
    const playerBar = progressBar(
        fight.player.hp,
        fight.player.maxHp,
        8
    );

    const enemyBar = progressBar(
        fight.enemy.hp,
        fight.enemy.maxHp,
        8
    );

    return `⚔️ *BATALHA*

👤 *${fight.player.name}* [Lv ${player.level}]
❤️ ${fight.player.hp}/${fight.player.maxHp}
[${playerBar}]
⚡ ${fight.player.energy}/${fight.player.maxEnergy}
🎯 CRIT ${fight.player.crit}%

👹 *${fight.enemy.name}* [Lv ${fight.enemy.level}]
❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}
[${enemyBar}]

🎁 *Recompensas*
✨ ${fight.enemy.xp} XP
💰 ${fight.enemy.gold} ouro

📜 *Últimas ações*
${fight.logs.slice(-4).join('\n')}`;
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

        let msg = `🏆 *VITÓRIA!*

✨ +${rewards.xp} XP
💰 +${rewards.gold} Ouro`;

        if (rewards.loot.length) {
            msg += `\n\n🎁 ${rewards.loot.join('\n')}`;
        }

        return editMessage(ctx, msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(
            1,
            Math.floor(player.maxHp * 0.25)
        );

        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        return editMessage(ctx, `💀 *DERROTA*`, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'fled') {
        player.hp = fight.player.hp;

        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);

        return editMessage(ctx, `🏃 *FUGIU*`, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
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

    const enemy = getRandomEnemy(
        player.currentMap,
        player.level
    );

    const fight = createFight(player, enemy);

    activeFights.set(ctx.from.id, fight);

    return editMessage(
        ctx,
        renderFightText(fight, player),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

async function handleAttack(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);

    if (!fight) return;

    processPlayerTurn(fight);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = getPlayer(ctx.from.id);

    player.hp = fight.player.hp;
    savePlayer(ctx.from.id, player);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(
        ctx,
        renderFightText(fight, player),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

async function handleSoul(ctx) {
    await ctx.answerCbQuery();

    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    useSoul(fight, 0);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    const player = getPlayer(ctx.from.id);

    return editMessage(
        ctx,
        renderFightText(fight, player),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

async function handleConsumables(ctx) {
    await ctx.answerCbQuery('🧪 Em breve');
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