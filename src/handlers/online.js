const { activeFights } = require('./combat');

async function handleOnline(ctx) {
    try {
        // Estima jogadores ativos (combates + aleatório)
        const fightsOnline = activeFights.size;
        const ambientPlayers = Math.floor(Math.random() * 50) + 10;
        const playersOnline = fightsOnline + ambientPlayers;
        await ctx.answerCbQuery(`👥 ${playersOnline} jogadores online!`, true);
    } catch (error) {
        console.error('Erro online:', error);
        await ctx.answerCbQuery('Erro ao consultar online.', true);
    }
}

module.exports = { handleOnline };