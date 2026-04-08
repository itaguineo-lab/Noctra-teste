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

const { Markup } = require('telegraf');

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

function renderBuffs(buffs = []) {
    if (!buffs.length) return '';

    return buffs
        .map(buff => {
            const turns = Math.max(
                0,
                Number(buff.remainingTurns) || 0
            );

            if (buff.type === 'atk') {
                return `💪 +${buff.value} (${turns})`;
            }

            if (buff.type === 'def') {
                return `🛡️ +${buff.value} (${turns})`;
            }

            return '';
        })
        .filter(Boolean)
        .join(' ');
}

function tickFightBuffs(fight) {
    if (!fight.player.buffs?.length) return;

    fight.player.buffs = fight.player.buffs
        .map(buff => ({
            ...buff,
            remainingTurns: Math.max(
                0,
                (buff.remainingTurns || 0) - 1
            )
        }))
        .filter(buff => buff.remainingTurns > 0);
}

/*
=================================
RENDER
=================================
*/

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

    const buffsText = renderBuffs(fight.player.buffs);
    const enemyBadge = getEnemyBadge(fight.enemy);

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ *BATALHA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}\n`;
    text += `[${playerBar}]\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ${fight.player.atk} • 🛡️ ${fight.player.def} • 🎯 ${fight.player.crit}%\n`;

    if (fight.player.defending) {
        text += `🛡️ *Defendendo*\n`;
    }

    if (buffsText) {
        text += `✨ ${buffsText}\n`;
    }

    const soul1 = fight.player.souls?.[0]?.name || 'vazio';
    const soul2 = fight.player.souls?.[1]?.name || 'vazio';

    text += `💀 [${soul1}] | [${soul2}]\n\n`;

    text += `${enemyBadge}\n`;
    text += `👹 *${fight.enemy.name}*\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}\n`;
    text += `[${enemyBar}]\n\n`;

    text += `📜 *Últimas ações*\n`;
    text += fight.logs.slice(-4).join('\n');

    return text;
}

/*
=================================
FINALIZAR
=================================
*/

async function finishFight(ctx, fight) {
    const player = await getPlayer(ctx.from.id);

    updateEnergy(player);

    if (fight.status === 'win') {
        const rewards = processVictory(player, fight.enemy);

        /*
        CORREÇÃO DO BUG DO HP
        */
        player.hp = Math.max(
            1,
            Math.min(
                fight.player.hp,
                player.maxHp
            )
        );

        player.energy = Math.min(
            fight.player.energy,
            player.maxEnergy
        );

        player.buffs = Array.isArray(fight.player.buffs)
            ? [...fight.player.buffs]
            : [];

        /*
        IMPORTANTE:
        NÃO recalcular stats aqui
        */
        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        const xpToNext =
            player.xpToNextLevel ||
            player.level * 100;

        const xpBar = progressBar(
            player.xp,
            xpToNext,
            10,
            '🟨',
            '⬛'
        );

        let msg = '';

        msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `${rewards.title}\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        msg += `👹 ${fight.enemy.name}\n`;
        msg += `⚔️ Turnos: ${fight.turnCount}\n`;
        msg += `💥 Dano causado: ${fight.totalDamageDealt}\n`;
        msg += `🛡️ Dano recebido: ${fight.totalDamageReceived}\n\n`;

        msg += `✨ +${rewards.xp} XP\n`;
        msg += `💰 +${rewards.gold} Ouro\n\n`;

        msg += `📈 XP: ${player.xp}/${xpToNext}\n`;
        msg += `[${xpBar}]\n\n`;

        msg += `❤️ HP restante: ${player.hp}/${player.maxHp}\n`;

        if (rewards.bonusGold > 0) {
            msg += `🎲 Bônus: +${rewards.bonusGold}\n`;
        }

        if (rewards.streakBonus > 0) {
            msg += `🔥 Streak: +${rewards.streakBonus}\n`;
        }

        if (rewards.leveledUp) {
            msg += `\n⬆️ *LEVEL UP!* Lv ${player.level}\n`;
        }

        msg += `☠️ Abates: ${rewards.totalKills}\n`;

        if (rewards.loot?.length) {
            msg += `\n🎁 *LOOT*\n`;
            msg += rewards.loot.join('\n');
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

        player.energy = Math.max(
            0,
            player.energy - 1
        );

        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return editMessage(
            ctx,
            `💀 *DERROTA*\n\n👹 ${fight.enemy.name}\n❤️ HP restante: ${player.hp}/${player.maxHp}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }

    if (fight.status === 'fled') {
        player.hp = Math.max(
            1,
            fight.player.hp
        );

        player.energy = fight.player.energy;

        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return editMessage(
            ctx,
            `🏃 *Você fugiu com sucesso!*\n❤️ HP restante: ${player.hp}/${player.maxHp}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }
}

/*
restante do arquivo mantido igual
*/

module.exports = {
    handleHunt,
    handleAttack,
    handleDefend,
    handleSoulMenu,
    handleSoul,
    handleConsumables,
    handleFlee,
    handleCombatBack,
    activeFights
};