const {
    getPlayer,
    savePlayer,
    recalculateStats
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
    progressBar,
    formatNumber
} = require('../utils/formatters');

const {
    getRandomEnemy
} = require('../core/world/enemies');

const { Markup } = require('telegraf');

const activeFights = new Map();
const FIGHT_TIMEOUT = 10 * 60 * 1000;

/*
=================================
MESSAGES
=================================
*/

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

/*
=================================
HELPERS
=================================
*/

function getFight(ctx) {
    const fight = activeFights.get(ctx.from.id);

    if (!fight) return null;

    if (
        Date.now() - fight.createdAt >
        FIGHT_TIMEOUT
    ) {
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

    let text = '';

    buffs.forEach(buff => {
        const turns = Math.max(0, Number(buff.remainingTurns) || 0);

        if (buff.type === 'atk') {
            text += `💪 ATK +${buff.value} (${turns}) `;
        }

        if (buff.type === 'def') {
            text += `🛡️ DEF +${buff.value} (${turns}) `;
        }
    });

    return text.trim();
}

function tickFightBuffs(fight) {
    if (!fight.player.buffs?.length) return;

    fight.player.buffs =
        fight.player.buffs
            .map(buff => ({
                ...buff,
                remainingTurns: Math.max(
                    0,
                    (buff.remainingTurns || 0) - 1
                )
            }))
            .filter(
                buff => buff.remainingTurns > 0
            );
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
        8,
        '🟥',
        '⬜'
    );

    const enemyBar = progressBar(
        fight.enemy.hp,
        fight.enemy.maxHp,
        8,
        '🟥',
        '⬜'
    );

    const buffsText = renderBuffs(fight.player.buffs);

    let text = `⚔️ *BATALHA*\n\n`;

    text += `👤 *${fight.player.name}* [Lv ${player.level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}\n`;
    text += `[${playerBar}]\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ATK ${fight.player.atk}\n`;
    text += `🛡️ DEF ${fight.player.def}\n`;
    text += `🎯 CRIT ${fight.player.crit}%\n`;

    if (fight.player.defending) {
        text += `🛡️ *Defendendo*\n`;
    }

    if (buffsText) {
        text += `✨ ${buffsText}\n`;
    }

    const soul1 =
        fight.player.souls[0]?.name || 'vazio';

    const soul2 =
        fight.player.souls[1]?.name || 'vazio';

    text += `💀 [${soul1}] | [${soul2}]\n\n`;

    text += `👹 *${fight.enemy.name}* [Lv ${fight.enemy.level}]\n`;
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
    let player = await getPlayer(ctx.from.id);

    updateEnergy(player);

    if (fight.status === 'win') {
        const rewards = processVictory(
            player,
            fight.enemy
        );

        player.hp = Math.min(
            fight.player.hp,
            player.maxHp
        );

        player.energy = Math.min(
            fight.player.energy,
            player.maxEnergy
        );

        player.buffs =
            Array.isArray(fight.player.buffs)
                ? [...fight.player.buffs]
                : [];

        recalculateStats(player);

        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        let msg = `🏆 *VITÓRIA!*\n\n`;
        msg += `👹 ${fight.enemy.name}\n`;
        msg += `⚔️ Turnos: ${fight.turnCount}\n`;
        msg += `💥 Dano: ${fight.totalDamageDealt}\n`;
        msg += `🛡️ Recebido: ${fight.totalDamageReceived}\n\n`;
        msg += `✨ +${rewards.xp} XP\n`;
        msg += `💰 +${rewards.gold} Ouro`;

        if (rewards.loot?.length) {
            msg += `\n🎁 ${rewards.loot.join('\n🎁 ')}`;
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
            `💀 *DERROTA*\n\n👹 ${fight.enemy.name}`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }

    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        player.energy = fight.player.energy;

        await savePlayer(ctx.from.id, player);

        activeFights.delete(ctx.from.id);

        return editMessage(
            ctx,
            `🏃 *Você fugiu com sucesso!*`,
            {
                parse_mode: 'Markdown',
                ...postCombatMenu()
            }
        );
    }
}

/*
=================================
INICIAR CAÇA
=================================
*/

async function handleHunt(ctx) {
    await ctx.answerCbQuery();

    let player = await getPlayer(ctx.from.id);

    updateEnergy(player);

    if (player.energy < 1) {
        return ctx.reply('⚡ Sem energia.');
    }

    const enemy = getRandomEnemy(
        player.currentMap,
        player.level
    );

    if (!enemy) {
        return ctx.reply('❌ Nenhum inimigo.');
    }

    if (!consumeEnergy(player, 1)) {
        return ctx.reply('⚡ Sem energia.');
    }

    await savePlayer(ctx.from.id, player);

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

/*
=================================
ATAQUE
=================================
*/

async function handleAttack(ctx) {
    await ctx.answerCbQuery();

    const fight = getFight(ctx);

    if (!fight) {
        return ctx.reply('⚠️ Batalha expirada.');
    }

    tickFightBuffs(fight);

    fight.turnCount++;

    processPlayerTurn(fight);

    fight.totalDamageDealt +=
        fight.lastDamageDealt || 0;

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);

        fight.totalDamageReceived +=
            fight.lastDamageReceived || 0;
    }

    fight.player.defending = false;

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(
        ctx,
        renderFightText(fight, {
            level: fight.player.level || 1
        }),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

/*
=================================
DEFESA
=================================
*/

async function handleDefend(ctx) {
    await ctx.answerCbQuery();

    const fight = getFight(ctx);

    if (!fight) {
        return ctx.reply('⚠️ Batalha expirada.');
    }

    tickFightBuffs(fight);

    fight.turnCount++;

    applyDefend(fight);

    processEnemyTurn(fight);

    fight.totalDamageReceived +=
        fight.lastDamageReceived || 0;

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(
        ctx,
        renderFightText(fight, {
            level: fight.player.level || 1
        }),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

/*
=================================
ALMAS
=================================
*/

async function handleSoulMenu(ctx) {
    await ctx.answerCbQuery();

    const fight = getFight(ctx);

    if (!fight) return;

    return ctx.editMessageText(
        '💀 *Escolha a alma:*',
        {
            parse_mode: 'Markdown',
            ...soulChoiceMenu()
        }
    );
}

async function handleSoul(ctx) {
    await ctx.answerCbQuery();

    const fight = getFight(ctx);

    if (!fight) return;

    const soulIndex = Number(ctx.match?.[1] || 0);

    tickFightBuffs(fight);

    fight.turnCount++;

    useSoul(fight, soulIndex);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);

        fight.totalDamageReceived +=
            fight.lastDamageReceived || 0;
    }

    if (fight.status !== 'ongoing') {
        return finishFight(ctx, fight);
    }

    return editMessage(
        ctx,
        renderFightText(fight, {
            level: fight.player.level || 1
        }),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
}

/*
=================================
CONSUMÍVEIS
=================================
*/

async function handleConsumables(ctx) {
    await ctx.answerCbQuery();

    return ctx.editMessageText(
        '🧪 Consumíveis em breve.',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '◀️ Voltar',
                        'combat_back'
                    )
                ]
            ])
        }
    );
}

/*
=================================
FUGA
=================================
*/

async function handleFlee(ctx) {
    await ctx.answerCbQuery();

    const fight = getFight(ctx);

    if (!fight) return;

    attemptFlee(fight);

    return finishFight(ctx, fight);
}

/*
=================================
VOLTAR
=================================
*/

async function handleCombatBack(ctx) {
    const fight = getFight(ctx);

    if (!fight) return;

    return editMessage(
        ctx,
        renderFightText(fight, {
            level: fight.player.level || 1
        }),
        {
            parse_mode: 'Markdown',
            ...combatMenu()
        }
    );
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
    activeFights
};