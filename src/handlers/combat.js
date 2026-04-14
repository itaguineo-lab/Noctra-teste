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

const {
    combatMenu,
    soulChoiceMenu,
    postCombatMenu
} = require('../menus/combatMenu');

const { progressBar } = require('../utils/formatters');
const { getRandomEnemy } = require('../core/world/enemies');
const assets = require('../data/assets');

const activeFights = new Map();
const FIGHT_TIMEOUT = 10 * 60 * 1000;

/*
=================================
HELPERS
=================================
*/

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
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery().catch(() => {});
            return await ctx.editMessageText(text, options);
        }

        return await ctx.reply(text, options);
    } catch (error) {
        console.error('Erro ao editar combate:', error);

        try {
            return await ctx.reply(text, options);
        } catch {
            return null;
        }
    }
}

async function sendEnemyImage(ctx, enemy) {
    const enemyImage = assets?.enemies?.[enemy.id];

    if (!enemyImage) return null;

    try {
        return await ctx.replyWithPhoto(enemyImage, {
            caption:
                `${getEnemyBadge(enemy)}\n` +
                `${enemy.emoji || '👹'} *${enemy.name}*\n\n` +
                `❤️ HP: ${enemy.hp}\n` +
                `⚔️ ATK: ${enemy.atk}\n` +
                `🛡️ DEF: ${enemy.def}`,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Erro ao enviar imagem do inimigo:', error);
        return null;
    }
}

function renderFightText(fight, player) {
    const playerBar = progressBar(
        fight.player.hp,
        fight.player.maxHp,
        8,
        '🟩',
        '⬛'
    );

    const enemyBar = progressBar(
        fight.enemy.hp,
        fight.enemy.maxHp,
        8,
        '🟥',
        '⬛'
    );

    let enemyStatusIcons = '';

    if (fight.enemy.poisonTurns > 0) enemyStatusIcons += '🧪';
    if (fight.enemy.bleedTurns > 0) enemyStatusIcons += '🩸';
    if (fight.enemy.shield > 0) enemyStatusIcons += '🛡️';
    if (fight.enemy.frozen) enemyStatusIcons += '❄️';

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ *BATALHA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp} ${playerBar}\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ${fight.player.atk} • 🛡️ ${fight.player.def}\n\n`;

    text += `${getEnemyBadge(fight.enemy)}\n`;
    text += `${fight.enemy.emoji || '👹'} *${fight.enemy.name}*`;

    if (enemyStatusIcons) {
        text += ` ${enemyStatusIcons}`;
    }

    text += `\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp} ${enemyBar}\n`;

    if (fight.enemy.shield > 0) {
        text += `🛡️ Escudo: ${fight.enemy.shield}\n`;
    }

    text += `⚔️ ${fight.enemy.atk} • 🛡️ ${fight.enemy.def}\n\n`;

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
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        let msg =
            `🏆 *VITÓRIA* 🏆\n\n` +
            `✨ XP: +${rewards.xp}\n` +
            `💰 Ouro: +${rewards.gold}\n` +
            `❤️ HP: ${player.hp}/${player.maxHp}\n`;

        if (rewards.loot?.length) {
            msg += `\n🎁 Loot:\n${rewards.loot.join('\n')}`;
        }

        return safeEditMessage(ctx, msg, {
            parse_mode: 'Markdown',
            ...postCombatMenu()
        });
    }

    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return safeEditMessage(
            ctx,
            `💀 *DERROTA*\n\n❤️ HP restaurado: ${player.hp}/${player.maxHp}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(1, fight.player.hp);
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return safeEditMessage(
            ctx,
            `🏃 *Você fugiu da batalha*`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }
}

/*
=================================
START FIGHT
=================================
*/

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

    const enemy = getRandomEnemy(
        player.currentMap,
        player.level
    );

    if (!enemy) {
        return ctx.reply('❌ Nenhum inimigo neste mapa.');
    }

    const fight = createFight(player, enemy);

    fight.createdAt = Date.now();

    activeFights.set(ctx.from.id, fight);

    await sendEnemyImage(ctx, enemy);

    return safeEditMessage(
        ctx,
        renderFightText(fight, player),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

/*
=================================
ATTACK
=================================
*/

async function handleAttack(ctx) {
    const fight = getFight(ctx);

    if (!fight) {
        return handleHunt(ctx);
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

/*
=================================
DEFEND
=================================
*/

async function handleDefend(ctx) {
    const fight = getFight(ctx);

    if (!fight) {
        return handleHunt(ctx);
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

/*
=================================
FLEE
=================================
*/

async function handleFlee(ctx) {
    const fight = getFight(ctx);

    if (!fight) {
        return handleHunt(ctx);
    }

    const success = attemptFlee(fight);

    if (success) {
        fight.status = 'fled';
        return finishFight(ctx, fight);
    }

    const player = await getPlayer(ctx.from.id);

    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

/*
=================================
SOUL
=================================
*/

async function handleSoulMenu(ctx) {
    return safeEditMessage(ctx, '💀 Escolha uma alma:', {
        parse_mode: 'Markdown',
        ...soulChoiceMenu()
    });
}

async function handleSoul(ctx) {
    const fight = getFight(ctx);

    if (!fight) {
        return handleHunt(ctx);
    }

    const soulIndex = parseInt(ctx.match[1], 10);

    const result = useSoul(fight, soulIndex);

    if (!result) {
        return ctx.answerCbQuery('❌ Alma inválida');
    }

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);

    return safeEditMessage(ctx, renderFightText(fight, player), {
        parse_mode: 'Markdown',
        ...combatMenu()
    });
}

async function handleConsumables(ctx) {
    return ctx.answerCbQuery('🧪 Em breve');
}

async function handleCombatBack(ctx) {
    const fight = getFight(ctx);

    if (!fight) {
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