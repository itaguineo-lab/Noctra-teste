const { getPlayerCollection } = require('../core/player/playerService');

// Verifica se o usuário é administrador
function isAdmin(ctx) {
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
    return adminIds.includes(String(ctx.from.id));
}

async function handleReset(ctx) {
    // Apenas administradores podem usar este comando
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem usar este comando.');
    }

    try {
        // Verifica se foi mencionado um usuário (para resetar outro jogador)
        const targetUser = ctx.message?.reply_to_message?.from || ctx.message?.entities?.find(e => e.type === 'mention')?.user;
        const targetId = targetUser ? String(targetUser.id) : String(ctx.from.id);

        const collection = await getPlayerCollection();
        await collection.deleteMany({
            $or: [
                { id: targetId },
                { telegramId: targetId }
            ]
        });

        const targetName = targetUser ? (targetUser.first_name || targetId) : 'seu';
        await ctx.reply(`♻️ Personagem de ${targetName} foi resetado com sucesso.`);
    } catch (error) {
        console.error('Erro reset:', error);
        await ctx.reply('❌ Erro ao resetar personagem.');
    }
}

module.exports = {
    handleReset
};