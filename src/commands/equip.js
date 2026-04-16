const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    applyEquipmentChange,
    applySoulEquip,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

/*
=================================
HELPERS
=================================
*/

function normalizePlayer(player) {
    if (!player.equipment) {
        player.equipment = {
            weapon: null,
            shield: null,
            armor: null,
            necklace: null,
            ring: null,
            boots: null
        };
    }

    if (!Array.isArray(player.inventory)) {
        player.inventory = [];
    }

    if (!Array.isArray(player.soulsInventory)) {
        player.soulsInventory = [];
    }

    if (!Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped = [null, null];
    }

    return player;
}

function getItemId(item) {
    return String(
        item?.id ??
        item?._id ??
        item?.instanceId
    );
}

function getRealSlot(item) {
    if (!item?.slot) return null;

    const validSlots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const slot of validSlots) {
        if (String(item.slot).startsWith(slot)) {
            return slot;
        }
    }

    return null;
}

/*
=================================
EQUIP ITEM
=================================
*/

function equipItemById(player, itemId) {
    player = normalizePlayer(player);

    const item = player.inventory.find(
        entry => entry && getItemId(entry) === String(itemId)
    );

    if (!item) {
        return {
            ok: false,
            message: '❌ Item não encontrado.'
        };
    }

    const slot = getRealSlot(item);
    if (!slot) {
        return {
            ok: false,
            message: '❌ Este item não pode ser equipado.'
        };
    }

    if (item.classRestriction && item.classRestriction !== player.class) {
        return {
            ok: false,
            message: `❌ Apenas ${item.classRestriction} pode equipar este item.`
        };
    }

    const result = applyEquipmentChange(player, slot, item);

    if (!result.success) {
        return {
            ok: false,
            message: `❌ ${result.message}`
        };
    }

    normalizePlayerForSave(player);

    return {
        ok: true,
        item
    };
}

/*
=================================
EQUIP SOUL
=================================
*/

function equipSoulById(player, soulId) {
    player = normalizePlayer(player);

    const soul = player.soulsInventory.find(
        entry => entry && String(entry.instanceId || entry.id) === String(soulId)
    );

    if (!soul) {
        return {
            ok: false,
            message: '❌ Alma não encontrada.'
        };
    }

    const result = applySoulEquip(player, soul);

    if (!result.success) {
        return {
            ok: false,
            message: `❌ ${result.message}`
        };
    }

    normalizePlayerForSave(player);

    return {
        ok: true,
        soul: result.soul
    };
}

/*
=================================
COMMANDS
=================================
*/

async function handleEquip(ctx) {
    try {
        const text = ctx.message?.text || '';
        const itemId = text.split(' ').slice(1).join(' ').trim();

        if (!itemId) {
            return ctx.reply('❌ Informe o ID do item.');
        }

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return ctx.reply('❌ Jogador não encontrado. Use /start.');
        }

        const result = equipItemById(player, itemId);

        if (!result.ok) {
            return ctx.reply(result.message);
        }

        await savePlayer(ctx.from.id, player);

        return ctx.reply(`⚔️ *${result.item.name} equipado!*`, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Erro ao equipar:', error);
        return ctx.reply('❌ Erro ao equipar item.');
    }
}

async function handleEquipSoulCommand(ctx) {
    try {
        const text = ctx.message?.text || '';
        const soulId = text.split(' ').slice(1).join(' ').trim();

        if (!soulId) {
            return ctx.reply('❌ Informe a alma.');
        }

        const player = await getPlayer(ctx.from.id);
        if (!player) {
            return ctx.reply('❌ Jogador não encontrado. Use /start.');
        }

        const result = equipSoulById(player, soulId);

        if (!result.ok) {
            return ctx.reply(result.message);
        }

        await savePlayer(ctx.from.id, player);

        return ctx.reply(`💀 *${result.soul.name} equipada!*`, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Erro ao equipar alma:', error);
        return ctx.reply('❌ Erro ao equipar alma.');
    }
}

module.exports = {
    handleEquip,
    handleEquipSoulCommand,
    equipItemById,
    equipSoulById
};