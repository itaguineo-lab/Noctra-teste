const { Markup } = require('telegraf');
const { getPlayerCollection } = require('../core/player/playerService');

// Verifica se o usuário é administrador
function isAdmin(ctx) {
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
    return adminIds.includes(String(ctx.from.id));
}

// Extrai o ID do alvo (menção, resposta ou próprio)
function extractTargetId(ctx) {
    // Se for uma resposta a uma mensagem de outro usuário
    if (ctx.message?.reply_to_message?.from) {
        return {
            id: String(ctx.message.reply_to_message.from.id),
            name: ctx.message.reply_to_message.from.first_name
        };
    }
    // Se houver menção (@usuario)
    const mentionEntity = ctx.message?.entities?.find(e => e.type === 'mention');
    if (mentionEntity) {
        const mentionText = ctx.message.text.substring(mentionEntity.offset, mentionEntity.offset + mentionEntity.length);
        return {
            id: mentionText.replace('@', ''), // retorna username, será resolvido depois
            name: mentionText
        };
    }
    // Padrão: o próprio usuário
    return {
        id: String(ctx.from.id),
        name: ctx.from.first_name
    };
}

// Handler principal
async function handleReset(ctx) {
    const target = extractTargetId(ctx);
    const isSelf = target.id === String(ctx.from.id);
    const isUserAdmin = isAdmin(ctx);

    // Se for admin resetando outro jogador (via menção ou resposta), executa imediatamente
    if (!isSelf && isUserAdmin) {
        return executeReset(ctx, target.id, target.name, true);
    }

    // Se for o próprio jogador (mesmo admin), pede confirmação
    if (isSelf) {
        return requestConfirmation(ctx);
    }

    // Se não for admin tentando resetar outro, bloqueia
    return ctx.reply('❌ Apenas administradores podem resetar outros jogadores.');
}

// Exibe mensagem de confirmação com botões inline
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

// Executa a exclusão do jogador
async function executeReset(ctx, targetId, targetName, isAdminAction = false) {
    try {
        const collection = await getPlayerCollection();
        
        // Se o targetId for um username (começa com @), precisa buscar no banco
        let finalId = targetId;
        let finalName = targetName;
        
        if (targetId.startsWith('@')) {
            const username = targetId.substring(1);
            const player = await collection.findOne({ name: { $regex: new RegExp(`^${username}$`, 'i') } });
            if (!player) {
                return ctx.reply(`❌ Jogador @${username} não encontrado.`);
            }
            finalId = player.id;
            finalName = player.name;
        }

        await collection.deleteMany({
            $or: [
                { id: finalId },
                { telegramId: finalId }
            ]
        });

        const message = isAdminAction && !targetId.startsWith(String(ctx.from.id))
            ? `♻️ Personagem de ${finalName} foi resetado por um administrador.`
            : `♻️ Seu personagem foi resetado com sucesso.\n\nUse /start para começar novamente.`;

        await ctx.reply(message);
    } catch (error) {
        console.error('Erro reset:', error);
        await ctx.reply('❌ Erro ao resetar personagem.');
    }
}

// Handlers para os botões de confirmação
async function handleResetConfirm(ctx) {
    await ctx.answerCbQuery();
    await executeReset(ctx, String(ctx.from.id), ctx.from.first_name, false);
    // Remove a mensagem de confirmação
    try {
        await ctx.deleteMessage();
    } catch (e) {
        // ignora
    }
}

async function handleResetCancel(ctx) {
    await ctx.answerCbQuery('Operação cancelada.');
    try {
        await ctx.deleteMessage();
    } catch (e) {
        // ignora
    }
}

module.exports = {
    handleReset,
    handleResetConfirm,
    handleResetCancel
};