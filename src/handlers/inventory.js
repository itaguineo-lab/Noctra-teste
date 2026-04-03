const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const { Markup } = require('telegraf');

function getBuildHint(item) {
    if (!item) return '';

    const scoreAtk = (item.atk || 0) + (item.crit || 0);
    const scoreTank = (item.def || 0) + (item.hp || 0);

    if (scoreTank > scoreAtk) {
        return '🛡️ defensivo';
    }

    return '⚔️ ofensivo';
}

function formatItem(item, index) {
    const stats = [];

    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);

    return `${index + 1}. ${item.emoji || '⚪'} ${item.name}\n   ${stats.join(' | ')}\n   ${getBuildHint(item)}`;
}

async function handleInventory(ctx) {
    await ctx.answerCbQuery?.();

    const player = getPlayer(ctx.from.id);

    const inventory = player.inventory || [];

    let text = `🎒 *INVENTÁRIO*\n\n`;

    if (!inventory.length) {
        text += `Seu inventário está vazio.`;
    } else {
        inventory.forEach((item, index) => {
            text += `${formatItem(item, index)}\n\n`;
        });
    }

    text += `📦 Slots: ${inventory.length}/${player.maxInventory}`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Equipar melhor item', 'auto_equip')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);

    try {
        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

function getBestItemForSlot(items, slot) {
    const slotItems = items.filter(i => i.slot === slot);

    if (!slotItems.length) return null;

    return slotItems.sort((a, b) => {
        const scoreA =
            (a.atk || 0) * 2 +
            (a.def || 0) * 1.5 +
            (a.hp || 0) * 0.7 +
            (a.crit || 0) * 2;

        const scoreB =
            (b.atk || 0) * 2 +
            (b.def || 0) * 1.5 +
            (b.hp || 0) * 0.7 +
            (b.crit || 0) * 2;

        return scoreB - scoreA;
    })[0];
}

async function handleAutoEquip(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    const slots = [
        'weapon',
        'armor',
        'ring',
        'necklace',
        'boots'
    ];

    let equipped = 0;

    slots.forEach(slot => {
        const best = getBestItemForSlot(
            player.inventory || [],
            slot
        );

        if (best) {
            player.equipment[slot] = best;
            equipped++;
        }
    });

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return ctx.reply(
        `✨ ${equipped} item(ns) equipados automaticamente!\n` +
        `🧠 Sua build foi atualizada com base no melhor equipamento.`
    );
}

module.exports = {
    handleInventory,
    handleAutoEquip
};