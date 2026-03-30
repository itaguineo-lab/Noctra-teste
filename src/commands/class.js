const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const ALLOWED_CLASSES = [
    'guerreiro',
    'arqueiro',
    'mago'
];

function formatClassName(name) {
    return (
        name.charAt(0)
            .toUpperCase() +
        name.slice(1)
    );
}

async function handleClass(ctx) {
    try {
        const args =
            ctx.message.text.split(' ');

        if (args.length < 2) {
            return ctx.reply(
                '❓ Uso: /class guerreiro | arqueiro | mago'
            );
        }

        const className =
            args[1].toLowerCase();

        if (
            !ALLOWED_CLASSES.includes(
                className
            )
        ) {
            return ctx.reply(
                '❌ Classe inválida.'
            );
        }

        const player =
            getPlayer(
                ctx.from.id
            );

        const firstFree =
            !player.classChanged;

        if (
            !firstFree &&
            (player.nox || 0) <
                500
        ) {
            return ctx.reply(
                '❌ Você precisa de 💎 500 Nox.'
            );
        }

        if (!firstFree) {
            player.nox -= 500;
        }

        player.class =
            className;

        player.classChanged =
            true;

        recalculateStats(player);

        player.hp =
            player.maxHp;

        savePlayer(
            ctx.from.id,
            player
        );

        await ctx.reply(
            `✨ Classe alterada para *${formatClassName(className)}*!`,
            {
                parse_mode:
                    'Markdown'
            }
        );
    } catch (error) {
        console.error(
            'Erro class:',
            error
        );

        await ctx.reply(
            '❌ Erro ao trocar classe.'
        );
    }
}

module.exports = {
    handleClass
};