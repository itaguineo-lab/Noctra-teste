const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    updateEnergy,
    getTimeToNextEnergy,
    getRegenInterval
} = require('../services/energyService');

const {
    progressBar,
    formatTime,
    formatDuration
} = require('../utils/formatters');

const { Markup } =
    require('telegraf');

/*
=================================
SAFE EDIT
=================================
*/

async function safeEdit(
    ctx,
    text,
    options = {}
) {
    try {
        if (
            ctx.callbackQuery
        ) {
            await ctx.answerCbQuery();

            return await ctx.editMessageText(
                text,
                options
            );
        }

        return await ctx.reply(
            text,
            options
        );
    } catch {
        return await ctx.reply(
            text,
            options
        );
    }
}

/*
=================================
RENDER
=================================
*/

async function renderEnergy(
    ctx
) {
    const player =
        await getPlayer(
            ctx.from.id
        );

    if (!player) {
        return ctx.reply(
            '❌ Perfil não encontrado.'
        );
    }

    updateEnergy(player);

    await savePlayer(
        ctx.from.id,
        player
    );

    const nextIn =
        getTimeToNextEnergy(
            player
        );

    const interval =
        getRegenInterval(
            player
        );

    const energyToFull =
        Math.max(
            0,
            player.maxEnergy -
                player.energy
        );

    const timeToFull =
        energyToFull *
        interval;

    const energyBar =
        progressBar(
            player.energy,
            player.maxEnergy,
            10,
            '🟨',
            '⬜'
        );

    const hpBar =
        progressBar(
            player.hp,
            player.maxHp,
            10,
            '🟥',
            '⬜'
        );

    const energyPercent =
        Math.floor(
            (player.energy /
                player.maxEnergy) *
                100
        );

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚡ *ENERGIA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `⚡ ${player.energy}/${player.maxEnergy}\n`;
    text += `[${energyBar}] ${energyPercent}%\n\n`;

    text += `❤️ ${player.hp}/${player.maxHp}\n`;
    text += `[${hpBar}]\n\n`;

    text += `⏱️ Regen: ${
        player.vip
            ? '8 min'
            : '10 min'
    }\n`;

    text += `⏳ Próxima: ${formatTime(nextIn)}\n`;
    text += `🕒 Até encher: ${formatDuration(timeToFull)}\n\n`;

    text += `🛌 Descansar cura HP total\n`;
    text += `⚡ Custo: 1 energia\n`;

    const keyboard =
        Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    '🛌 Descansar',
                    'rest_energy'
                )
            ],
            [
                Markup.button.callback(
                    '🛒 Loja',
                    'shop'
                )
            ],
            [
                Markup.button.callback(
                    '🏠 Menu',
                    'menu'
                )
            ]
        ]);

    return safeEdit(
        ctx,
        text,
        {
            parse_mode:
                'Markdown',
            ...keyboard
        }
    );
}

/*
=================================
HANDLERS
=================================
*/

async function handleEnergy(
    ctx
) {
    return renderEnergy(
        ctx
    );
}

async function handleRestEnergy(
    ctx
) {
    try {
        const player =
            await getPlayer(
                ctx.from.id
            );

        if (!player) {
            return ctx.answerCbQuery(
                'Perfil não encontrado.',
                {
                    show_alert: true
                }
            );
        }

        updateEnergy(player);

        if (
            player.hp >=
            player.maxHp
        ) {
            return ctx.answerCbQuery(
                '❤️ HP já está cheio.',
                {
                    show_alert: true
                }
            );
        }

        if (
            player.energy < 1
        ) {
            return ctx.answerCbQuery(
                '⚡ Energia insuficiente.',
                {
                    show_alert: true
                }
            );
        }

        player.energy -= 1;
        player.hp =
            player.maxHp;

        await savePlayer(
            ctx.from.id,
            player
        );

        return renderEnergy(
            ctx
        );
    } catch (error) {
        console.error(
            'Erro ao descansar:',
            error
        );

        return ctx.answerCbQuery(
            'Erro ao descansar.',
            {
                show_alert: true
            }
        );
    }
}

module.exports = {
    handleEnergy,
    handleRestEnergy
};