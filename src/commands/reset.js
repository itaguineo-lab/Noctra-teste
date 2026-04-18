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

    const parts = (ctx.message?.text || '').trim().split(/\s+/);
    if (parts[1]) {
        return {
            type: 'id',
            value: String(parts[1]).replace('@', '').trim(),
            label: parts[1]
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
RESET SELF
=================================
*/

async function handleReset(ctx) {
    const target = {
        type: 'id',
        value: String(ctx.from.id),
        label: ctx.from.first_name || 'jogador'
    };

    return requestSelfResetConfirmation(ctx, target);
}

async function requestSelfResetConfirmation(ctx) {
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Sim, resetar meu personagem', 'reset_confirm'),
            Markup.button.callback('❌ Cancelar', 'reset_cancel')
        ]
    ]);

    await ctx.reply(
        '⚠️ *ATENÇÃO*\n\n' +
        'Você está prestes a *resetar completamente* seu personagem.\n' +
        'Todo o progresso, itens, ouro, NOX, almas e progresso de mapas serão *perdidos para sempre*.\n\n' +
        'Deseja realmente continuar?',
        {
            parse_mode: 'Markdown',
            ...keyboard
        }
    );
}

async function executeResetPlayer(ctx, target, isAdminAction = false) {
    try {
        const collection = await getPlayerCollection();
        const player = await resolveTargetPlayer(collection, target);

        if (!player) {
            return ctx.reply(
                target.type === 'id'
                    ? `❌ Jogador ${target.value} não encontrado.`
                    : `❌ Jogador ${target.label} não encontrado.`
            );
        }

        await collection.deleteOne({ _id: player._id });

        const message = isAdminAction
            ? `♻️ Personagem de *${player.name}* foi resetado com sucesso.`
            : `♻️ Seu personagem foi resetado com sucesso.\n\nUse /start para começar novamente.`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Erro reset player:', error);
        await ctx.reply('❌ Erro ao resetar personagem.');
    }
}

async function handleResetConfirm(ctx) {
    await ctx.answerCbQuery();

    await executeResetPlayer(ctx, {
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

/*
=================================
RESET SPECIFIC PLAYER (ADMIN)
=================================
*/

async function handleResetPlayer(ctx) {
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem resetar outros jogadores.');
    }

    const target = extractTarget(ctx);

    if (!target?.value || target.value === String(ctx.from.id)) {
        return ctx.reply('❌ Informe um ID válido de jogador para resetar.\nEx: /resetplayer 123456789');
    }

    return executeResetPlayer(ctx, target, true);
}

/*
=================================
RESET ALL PLAYERS (ADMIN)
=================================
*/

async function handleResetAll(ctx) {
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem resetar o jogo todo.');
    }

    const text = (ctx.message?.text || '').trim();
    const parts = text.split(/\s+/);
    const confirmation = parts[1];

    if (confirmation !== 'CONFIRMAR_RESET_TOTAL') {
        return ctx.reply(
            '⚠️ Comando extremamente destrutivo.\n\n' +
            'Para resetar o jogo todo, use exatamente:\n' +
            '`/resetall CONFIRMAR_RESET_TOTAL`',
            { parse_mode: 'Markdown' }
        );
    }

    try {
        const collection = await getPlayerCollection();
        const result = await collection.deleteMany({});

        return ctx.reply(
            `💥 Reset global concluído.\n\n` +
            `Jogadores removidos: ${result.deletedCount || 0}`
        );
    } catch (error) {
        console.error('Erro reset all:', error);
        return ctx.reply('❌ Erro ao resetar o jogo todo.');
    }
}

module.exports = {
    handleReset,
    handleResetConfirm,
    handleResetCancel,
    handleResetPlayer,
    handleResetAll
};