const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const {
    getEquipmentLoadoutIssues,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const ALLOWED_CLASSES = [
    'guerreiro',
    'arqueiro',
    'mago'
];

const CLASS_CHANGE_COST = 25;

function formatClassName(name = '') {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getUsageMessage() {
    return (
        '❓ *Uso correto:*\n\n' +
        '/class guerreiro\n' +
        '/class arqueiro\n' +
        '/class mago'
    );
}

async function handleClass(ctx) {
    try {
        const text = ctx.message?.text || '';
        const args = text.trim().split(/\s+/);

        if (args.length < 2) {
            return ctx.reply(getUsageMessage(), {
                parse_mode: 'Markdown'
            });
        }

        const className = args[1].toLowerCase();

        if (!ALLOWED_CLASSES.includes(className)) {
            return ctx.reply('❌ Classe inválida.\nUse: guerreiro, arqueiro ou mago.');
        }

        const player = await getPlayer(ctx.from.id);

        if (!player) {
            return ctx.reply('❌ Perfil não encontrado.');
        }

        if (player.class === className) {
            return ctx.reply(`⚠️ Você já é *${formatClassName(className)}*.`, {
                parse_mode: 'Markdown'
            });
        }

        const loadoutIssues = getEquipmentLoadoutIssues(player, className);
        if (loadoutIssues.length) {
            const preview = loadoutIssues.slice(0, 5).map(issue => `• ${issue}`).join('\n');

            return ctx.reply(
                `❌ Não é possível trocar de classe com o equipamento atual.\n\n` +
                `Desequipe os itens incompatíveis primeiro:\n${preview}`,
                { parse_mode: 'Markdown' }
            );
        }

        const firstFree = !player.classChanged;

        if (!firstFree) {
            if ((player.nox || 0) < CLASS_CHANGE_COST) {
                return ctx.reply(`❌ Você precisa de 💎 ${CLASS_CHANGE_COST} Nox.`);
            }

            player.nox -= CLASS_CHANGE_COST;
        }

        player.class = className;
        player.classChanged = true;

        recalculateStats(player);
        player.hp = player.maxHp;
        player.energy = player.maxEnergy;

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        return ctx.reply(
            `✨ Classe alterada para *${formatClassName(className)}*!\n\n` +
            `⚔️ Regras de equipamento da classe já estão ativas.`,
            {
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error('Erro class:', error);
        return ctx.reply('❌ Erro ao trocar classe.');
    }
}

module.exports = {
    handleClass
};