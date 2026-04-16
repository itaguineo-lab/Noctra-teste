const { Markup } = require('telegraf');
const { getPlayerCollection } = require('../core/player/playerService');

/*
=================================
ADMIN
=================================
*/

function isAdmin(ctx) {
    const adminIds = process.env.ADMIN_IDS
        ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
        : [];

    return adminIds.includes(String(ctx.from.id));
}

/*
=================================
TARGET EXTRACTION
=================================
*/

function extractTarget(ctx) {
    if (ctx.message?.reply_to_message?.from) {
        return {
            type: 'id',
            value: String(ctx.message.reply_to_message.from.id),
            label: ctx.message.reply_to_message.from.first_name || 'jogador'
        };
    }

    const mentionEntity = ctx.message?.entities?.find(e => e.type === 'mention');
    if (mentionEntity) {
        const mentionText = ctx.message.text.substring(
            mentionEntity.offset,
            mentionEntity.offset + mentionEntity.length
        );

        return {
            type: 'username',
            value: mentionText.replace('@', ''),
            label: mentionText
        };
    }

    return {
        type: 'id',
        value: String(ctx.from.id),
        label: ctx.from.first_name || 'jogador'
    };
}

async function resolveTargetPlayer(collection, target) {
    if (target.type === 'id') {
        return await collection.findOne({
            $or: [
                { id: target.value },
                { telegramId: target.value }
            ]
        });
    }

    return await collection.findOne({
        name: {
            $regex: new RegExp(`^${target.value}$`, 'i')
        }
    });
}

/*
=================================
RESET FLOW
=================================
*/

async function handleReset(ctx) {
    const target = extractTarget(ctx);
    const isSelf = target.type === 'id' && target.value === String(ctx.from.id);
    const userIsAdmin = isAdmin(ctx);

    if (!isSelf && userIsAdmin) {
        return executeReset(ctx, target, true);
    }

    if (isSelf) {
        return requestConfirmation(ctx);
    }

    return ctx.reply('❌ Apenas administradores podem resetar outros jogadores.');
}

async function requestConfirmation(ctx) {
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Sim, resetar meu personagem', 'reset_confirm'),
            Markup.button.callback('❌ Cancelar', 'reset_cancel')
        ]
    ]);

    await ctx.reply(
        '⚠️ *ATENÇÃO*\n\n' +
        'Você está prestes a *resetar completamente* seu personagem.\n' +
        'Todo o progresso, itens, ouro, NOX e almas serão *perdidos para sempre*.\n\n' +
        'Deseja realmente continuar?',
        {
            parse_mode: 'Markdown',
            ...keyboard
        }
    );
}

async function executeReset(ctx, target, isAdminAction = false) {
    try {
        const collection = await getPlayerCollection();
        const player = await resolveTargetPlayer(collection, target);

        if (!player) {
            return ctx.reply(
                target.type === 'username'
                    ? `❌ Jogador @${target.value} não encontrado.`
                    : '❌ Jogador não encontrado.'
            );
        }

        await collection.deleteOne({ _id: player._id });

        const message = isAdminAction
            ? `♻️ Personagem de ${player.name} foi resetado por um administrador.`
            : `♻️ Seu personagem foi resetado com sucesso.\n\nUse /start para começar novamente.`;

        await ctx.reply(message);
    } catch (error) {
        console.error('Erro reset:', error);
        await ctx.reply('❌ Erro ao resetar personagem.');
    }
}

async function handleResetConfirm(ctx) {
    await ctx.answerCbQuery();

    await executeReset(ctx, {
        type: 'id',
        value: String(ctx.from.id),
        label: ctx.from.first_name
    }, false);

    try {
        await ctx.deleteMessage();
    } catch {}
}

async function handleResetCancel(ctx) {
    await ctx.answerCbQuery('Operação cancelada.');

    try {
        await ctx.deleteMessage();
    } catch {}
}

module.exports = {
    handleReset,
    handleResetConfirm,
    handleResetCancel
};