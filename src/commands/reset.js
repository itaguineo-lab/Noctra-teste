const { getPlayerCollection } = require('../core/player/playerService');

async function handleReset(ctx) {
    try {
        const collection = await getPlayerCollection();
        const telegramId = String(ctx.from.id);

        await collection.deleteMany({
            $or: [
                { id: ctx.from.id },
                { id: telegramId },
                { telegramId }
            ]
        });

        await ctx.reply(
            '♻️ Seu personagem foi resetado com sucesso.\n\nUse /start para criar novamente.'
        );
    } catch (error) {
        console.error('Erro reset:', error);
        await ctx.reply('❌ Erro ao resetar personagem.');
    }
}

module.exports = {
    handleReset
};