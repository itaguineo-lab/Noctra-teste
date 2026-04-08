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

const CLASS_CHANGE_COST = 25;

/*
=================================
HELPERS
=================================
*/

function formatClassName(
    name = ''
) {
    return (
        name.charAt(0)
            .toUpperCase() +
        name.slice(1)
    );
}

function getUsageMessage() {
    return (
        '❓ *Uso correto:*\n\n' +
        '/class guerreiro\n' +
        '/class arqueiro\n' +
        '/class mago'
    );
}

/*
=================================
CLASS
=================================
*/

async function handleClass(
    ctx
) {
    try {
        const text =
            ctx.message?.text || '';

        const args =
            text
                .trim()
                .split(/\s+/);

        if (args.length < 2) {
            return ctx.reply(
                getUsageMessage(),
                {
                    parse_mode:
                        'Markdown'
                }
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
                '❌ Classe inválida.\nUse: guerreiro, arqueiro ou mago.'
            );
        }

        const player =
            await getPlayer(
                ctx.from.id
            );

        if (!player) {
            return ctx.reply(
                '❌ Perfil não encontrado.'
            );
        }

        const firstFree =
            !player.classChanged;

        if (!firstFree) {
            if (
                (player.nox || 0) <
                CLASS_CHANGE_COST
            ) {
                return ctx.reply(
                    `❌ Você precisa de 💎 ${CLASS_CHANGE_COST} Nox.`
                );
            }

            player.nox -=
                CLASS_CHANGE_COST;
        }

        player.class =
            className;

        player.classChanged =
            true;

        recalculateStats(
            player
        );

        player.hp =
            player.maxHp;

        player.energy =
            player.maxEnergy;

        await savePlayer(
            ctx.from.id,
            player
        );

        return ctx.reply(
            `✨ Classe alterada para *${formatClassName(className)}*!\n\n🧠 A especialização será definida pela sua *build*.`,
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

        return ctx.reply(
            '❌ Erro ao trocar classe.'
        );
    }
}

module.exports = {
    handleClass
};