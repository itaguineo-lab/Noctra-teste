const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

function sanitizeName(name) {
    return name
        .trim()
        .replace(/\s+/g, ' ');
}

async function handleRename(ctx) {
    try {
        const args =
            ctx.message.text.split(' ');

        if (args.length < 2) {
            return ctx.reply(
                '📝 Uso: /rename novo_nome'
            );
        }

        const newName =
            sanitizeName(
                args
                    .slice(1)
                    .join(' ')
            );

        if (
            newName.length < 3
        ) {
            return ctx.reply(
                '❌ Nome muito curto.'
            );
        }

        if (
            newName.length > 20
        ) {
            return ctx.reply(
                '❌ Máximo 20 caracteres.'
            );
        }

        const player =
            getPlayer(
                ctx.from.id
            );

        const firstFree =
            !player.renamed;

        if (firstFree) {
            player.renamed =
                true;
            player.name =
                newName;

            savePlayer(
                ctx.from.id,
                player
            );

            return ctx.reply(
                `✅ Nome alterado para *${newName}*!\nPrimeira troca gratuita.`,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }

        if (
            (player.nox || 0) <
            100
        ) {
            return ctx.reply(
                '❌ Você precisa de 💎 100 Nox.'
            );
        }

        player.nox -= 100;
        player.name = newName;

        savePlayer(
            ctx.from.id,
            player
        );

        await ctx.reply(
            `✅ Nome alterado para *${newName}*!\nCusto: 💎 100 Nox.`,
            {
                parse_mode:
                    'Markdown'
            }
        );
    } catch (error) {
        console.error(
            'Erro rename:',
            error
        );

        await ctx.reply(
            '❌ Erro ao renomear.'
        );
    }
}

module.exports = {
    handleRename
};