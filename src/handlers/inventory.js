const { getPlayer } = require('../core/player/playerService');
const { inventoryCategoryMenu } = require('../menus/inventoryMenu');

function getRarityEmoji(rarity) {
    const map = {
        Comum: '⚪',
        Incomum: '🟢',
        Raro: '🔵',
        Épico: '🟣',
        Lendário: '🟡',
        Mítico: '🔴'
    };

    return map[rarity] || '⚪';
}

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch (error) {
        await ctx.reply(text, options);
    }
}

async function handleInventory(ctx) {
    await safeEdit(
        ctx,
        '🎒 *Seu Inventário*\n\nEscolha uma categoria:',
        {
            parse_mode: 'Markdown',
            ...inventoryCategoryMenu()
        }
    );
}

async function handleInvWeapons(ctx) {
    await renderCategory(ctx, 'weapon', '⚔️ ARMAS');
}

async function handleInvArmors(ctx) {
    await renderCategory(ctx, 'armor', '🛡️ ARMADURAS');
}

async function handleInvJewelry(ctx) {
    await renderCategory(ctx, 'accessory', '📿 ACESSÓRIOS');
}

async function handleInvConsumables(ctx) {
    try {
        const player = getPlayer(ctx.from.id);

        const inventory = player.inventory || [];

        const hpPotions = inventory.filter(
            item => item?.id === 'potion_hp'
        ).length;

        const energyPotions = inventory.filter(
            item => item?.id === 'potion_energy'
        ).length;

        const tonics = inventory.filter(
            item => item?.id === 'tonic_strength'
        ).length;

        const text =
            `🧪 *CONSUMÍVEIS*\n\n` +
            `❤️ Poções HP: ${hpPotions}\n` +
            `⚡ Poções Energia: ${energyPotions}\n` +
            `💪 Tônicos Atk: ${tonics}`;

        await safeEdit(ctx, text, {
            parse_mode: 'Markdown',
            ...inventoryCategoryMenu()
        });
    } catch (error) {
        console.error('Erro ao carregar consumíveis:', error);
        await ctx.answerCbQuery(
            'Erro ao carregar consumíveis.'
        );
    }
}

async function handleInvSouls(ctx) {
    try {
        const player = getPlayer(ctx.from.id);

        const souls = player.souls || [];

        let text = `💀 *ALMAS* (${souls.length})\n\n`;

        if (!souls.length) {
            text += 'Nenhuma alma obtida.';
        } else {
            souls.forEach((soul, index) => {
                if (!soul) return;

                text +=
                    `${getRarityEmoji(soul.rarity)} ` +
                    `${soul.emoji || '💀'} ` +
                    `*${soul.name}*\n`;

                text +=
                    `Slot ${index + 1}\n\n`;
            });
        }

        await safeEdit(ctx, text, {
            parse_mode: 'Markdown',
            ...inventoryCategoryMenu()
        });
    } catch (error) {
        console.error('Erro ao carregar almas:', error);
        await ctx.answerCbQuery(
            'Erro ao carregar almas.'
        );
    }
}

async function renderCategory(ctx, slot, title) {
    try {
        const player = getPlayer(ctx.from.id);

        const items = (player.inventory || []).filter(
            item => item && item.slot === slot
        );

        let text = `*${title}* (${items.length})\n\n`;

        if (!items.length) {
            text += 'Nenhum item nesta categoria.';
        } else {
            items.forEach(item => {
                text +=
                    `${getRarityEmoji(item.rarity)} ` +
                    `*${item.name}*\n`;

                text +=
                    `⚔️ +${item.atk || 0} | ` +
                    `🛡️ +${item.def || 0} | ` +
                    `✨ +${item.crit || 0}%\n`;

                text +=
                    `🆔 ${item.id}\n\n`;
            });
        }

        await safeEdit(ctx, text, {
            parse_mode: 'Markdown',
            ...inventoryCategoryMenu()
        });
    } catch (error) {
        console.error(
            `Erro ao listar ${title}:`,
            error
        );

        await ctx.answerCbQuery(
            'Erro ao carregar itens.'
        );
    }
}

module.exports = {
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvConsumables,
    handleInvSouls
};