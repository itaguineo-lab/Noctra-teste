const { getPlayer, savePlayer } = require('../core/player/playerService');
const { addXp } = require('../core/player/progression');
const {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee
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

function renderFightText(fight) {
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

    return (
        `⚔️ *Combate em andamento*\n\n` +

        `👤 *${fight.player.name}*\n` +
        `❤️ HP: ${fight.player.hp}/${fight.player.maxHp}\n` +
        `[${playerBar}]\n\n` +

        `👾 *${fight.enemy.name}* (Lv ${fight.enemy.level})\n` +
        `❤️ HP: ${fight.enemy.hp}/${fight.enemy.maxHp}\n` +
        `[${enemyBar}]\n\n` +

        `${fight.logs.join('\n')}`
    );
}

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function finishFight(ctx, fight) {
    const player = getPlayer(ctx.from.id);

    if (fight.status === 'win') {
        const rewards = fight.rewards || {
            xp: 0,
            gold: 0
        };

        player.xp += rewards.xp || 0;
        player.gold =
            (player.gold || 0) +
            (rewards.gold || 0);

        addXp(player, 0);

        player.hp = Math.max(
            1,
            fight.player.hp
        );

        savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return safeEdit(
            ctx,
            `🏆 *Vitória!*\n\n${fight.logs.join('\n')}\n\n` +
                `✨ +${rewards.xp || 0} XP\n` +
                `💰 +${rewards.gold || 0} Ouro`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(
            1,
            Math.floor(player.maxHp * 0.25)
        );

        savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return safeEdit(
            ctx,
            `☠️ *Derrota...*\n\n${fight.logs.join('\n')}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }

    if (fight.status === 'fled') {
        player.hp = fight.player.hp;

        savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return safeEdit(
            ctx,
            `🏃 *Fuga bem-sucedida!*\n\n${fight.logs.join('\n')}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }
}

async function handleHunt(ctx) {
    const player = getPlayer(ctx.from.id);

    if (!player) {
        return ctx.reply('❌ Perfil não encontrado.');
    }

    if (activeFights.has(ctx.from.id)) {
        const fight = activeFights.get(ctx.from.id);

        return safeEdit(
            ctx,
            renderFightText(fight),
            {
                parse_mode: 'Markdown',
                ...combatMenu()
            }
        );
    }

    const enemy = getRandomEnemy(player.level || 1);

    const fight = createFight(player, enemy);

    activeFights.set(ctx.from.id, fight);

    return ctx.reply(
        renderFightText(fight),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

async function handleAttack(ctx) {
    const fight = activeFights.get(ctx.from.id);

    if (!fight) {
        return ctx.answerCbQuery('Nenhum combate ativo.');
    }

    processPlayerTurn(fight);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return safeEdit(
        ctx,
        renderFightText(fight),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

async function handleFlee(ctx) {
    const fight = activeFights.get(ctx.from.id);

    if (!fight) {
        return ctx.answerCbQuery('Nenhum combate ativo.');
    }

    attemptFlee(fight);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    processEnemyTurn(fight);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return safeEdit(
        ctx,
        renderFightText(fight),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

module.exports = {
    handleHunt,
    handleAttack,
    handleFlee,
    activeFights
};