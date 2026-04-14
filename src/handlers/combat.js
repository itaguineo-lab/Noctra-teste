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

function renderFightText(fight, player) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬛');

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ *BATALHA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp} ${playerBar}\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ${fight.player.atk} • 🛡️ ${fight.player.def}\n\n`;

    text += `${getEnemyBadge(fight.enemy)}\n`;
    text += `${fight.enemy.emoji || '👹'} *${fight.enemy.name}*\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp} ${enemyBar}\n`;
    text += `⚔️ ${fight.enemy.atk} • 🛡️ ${fight.enemy.def}\n\n`;

    text += `📜 *Últimas ações*\n`;
    text += fight.logs.slice(-4).join('\n');

    return text;
}

async function sendOrUpdateFightPanel(ctx, fight, player) {
    const text = renderFightText(fight, player);

    if (fight.panelMessageId) {
        try {
            return await ctx.telegram.editMessageText(
                ctx.chat.id,
                fight.panelMessageId,
                null,
                text,
                {
                    parse_mode: 'Markdown',
                    ...combatMenu()
                }
            );
        } catch (error) {
            console.log('Painel não pôde ser editado, recriando...');
        }
    }

    const sent = await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...combatMenu()
    });

    fight.panelMessageId = sent.message_id;
    return sent;
}

async function sendEnemyImageOnce(ctx, fight) {
    if (fight.enemyImageSent) return;

    const enemyImage = assets?.enemies?.[fight.enemy.id];

    if (!enemyImage) return;

    await ctx.replyWithPhoto(enemyImage, {
        caption:
            `${fight.enemy.emoji || '👹'} *${fight.enemy.name}*`,
        parse_mode: 'Markdown'
    });

    fight.enemyImageSent = true;
}

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

    const fight = createFight(player, enemy);

    fight.createdAt = Date.now();
    fight.enemyImageSent = false;
    fight.panelMessageId = null;

    activeFights.set(ctx.from.id, fight);

    await sendEnemyImageOnce(ctx, fight);
    return sendOrUpdateFightPanel(ctx, fight, player);
}

async function handleAttack(ctx) {
    const fight = getFight(ctx);

    if (!fight) return handleHunt(ctx);

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

async function handleDefend(ctx) {
    const fight = getFight(ctx);

    if (!fight) return handleHunt(ctx);

    applyDefend(fight);
    processEnemyTurn(fight);

    const player = await getPlayer(ctx.from.id);

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return sendOrUpdateFightPanel(ctx, fight, player);
}

async function handleFlee(ctx) {
    const fight = getFight(ctx);

    if (!fight) return handleHunt(ctx);

    const success = attemptFlee(fight);

    if (success) {
        fight.status = 'fled';
        return finishFight(ctx, fight);
    }

    const player = await getPlayer(ctx.from.id);
    return sendOrUpdateFightPanel(ctx, fight, player);
}

async function finishFight(ctx, fight) {
    activeFights.delete(ctx.from.id);

    return ctx.reply('🏁 Combate encerrado.', {
        ...postCombatMenu()
    });
}

async function handleSoulMenu(ctx) {
    return ctx.reply('💀 Escolha uma alma:', {
        ...soulChoiceMenu()
    });
}

async function handleSoul(ctx) {
    const fight = getFight(ctx);

    if (!fight) return handleHunt(ctx);

    const soulIndex = parseInt(ctx.match[1], 10);

    useSoul(fight, soulIndex);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    const player = await getPlayer(ctx.from.id);

    return sendOrUpdateFightPanel(ctx, fight, player);
}

async function handleConsumables(ctx) {
    return ctx.answerCbQuery('🧪 Em breve');
}

async function handleCombatBack(ctx) {
    const fight = getFight(ctx);

    if (!fight) return handleHunt(ctx);

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