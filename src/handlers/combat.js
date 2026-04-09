const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    consumeEnergy,
    updateEnergy
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

async function editMessage(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            return await ctx.editMessageText(text, options);
        }

        return await ctx.reply(text, options);
    } catch {
        return await ctx.reply(text, options);
    }
}

function renderFightText(fight, player) {
    const playerBar = progressBar(
        fight.player.hp,
        fight.player.maxHp,
        10,
        '🟩',
        '⬛'
    );

    const enemyBar = progressBar(
        fight.enemy.hp,
        fight.enemy.maxHp,
        10,
        '🟥',
        '⬛'
    );

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
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

        player.hp = Math.max(
            1,
            Math.min(fight.player.hp, player.maxHp)
        );

        player.energy = Math.min(
            fight.player.energy,
            player.maxEnergy
        );

        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return editMessage(
            ctx,
            `🏆 *VITÓRIA*\n\n✨ +${rewards.xp} XP\n💰 +${rewards.gold} Ouro\n❤️ ${player.hp}/${player.maxHp}`,
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

        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return editMessage(
            ctx,
            `💀 *DERROTA*\n❤️ ${player.hp}/${player.maxHp}`,
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

        return editMessage(
            ctx,
            `🏃 *FUGA*\n❤️ ${player.hp}/${player.maxHp}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }
}

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

    /*
    CORREÇÃO PRINCIPAL DO HP
    recarrega player salvo
    */
    player = await getPlayer(ctx.from.id);

    const enemy = getRandomEnemy(
        player.currentMap,
        player.level
    );

    if (!enemy) {
        return ctx.reply('❌ Nenhum inimigo.');
    }

    const fight = createFight(player, enemy);

    fight.createdAt = Date.now();
    fight.turnCount = 0;
    fight.totalDamageDealt = 0;
    fight.totalDamageReceived = 0;

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

module.exports = {
    handleHunt,
    finishFight,
    activeFights
};