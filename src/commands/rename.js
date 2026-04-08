const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

/*
=================================
HELPERS
=================================
*/

function sanitizeName(name = '') {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '');
}

function isValidName(name) {
    return (
        name.length >= 3 &&
        name.length <= 20
    );
}

/*
=================================
RENAME
=================================
*/

async function handleRename(ctx) {
    try {
        const text =
            ctx.message?.text || '';

        const args = text
            .trim()
            .split(/\s+/);

        if (args.length < 2) {
            return ctx.reply(
                '📝 *Uso correto:*\n\n/rename novo_nome',
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }

        const newName =
            sanitizeName(
                args
                    .slice(1)
                    .join(' ')
            );

        if (!isValidName(newName)) {
            return ctx.reply(
                '❌ O nome deve ter entre *3 e 20 caracteres*.',
                {
                    parse_mode:
                        'Markdown'
                }
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
            !player.renamed;

        if (firstFree) {
            player.renamed = true;
            player.name = newName;

            await savePlayer(
                ctx.from.id,
                player
            );

            return ctx.reply(
                `✅ Nome alterado para *${newName}*!\n\n🎁 Primeira troca gratuita.`,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }

        const cost = 100;

        if (
            (player.nox || 0) <
            cost
        ) {
            return ctx.reply(
                `❌ Você precisa de 💎 *${cost} Nox*.`,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }

        player.nox -= cost;
        player.name = newName;

        await savePlayer(
            ctx.from.id,
            player
        );

        return ctx.reply(
            `✅ Nome alterado para *${newName}*!\n💎 Custo: ${cost} Nox.`,
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

        return ctx.reply(
            '❌ Erro ao renomear.'
        );
    }
}

module.exports = {
    handleRename
};