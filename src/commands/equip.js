const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

/*
=================================
HELPERS
=================================
*/

function normalizePlayer(player) {
    if (!player.equipment) {
        player.equipment = {
            weapon: null,
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

/*
=================================
EQUIP ITEM
=================================
*/

function equipItemById(player, itemId) {
    player = normalizePlayer(player);

    const itemIndex = player.inventory.findIndex(
        item => item && getItemId(item) === String(itemId)
    );

    if (itemIndex === -1) {
        return {
            ok: false,
            message: '❌ Item não encontrado.'
        };
    }

    const item = player.inventory[itemIndex];

    const validSlots = [
        'weapon',
        'armor',
        'necklace',
        'ring',
        'boots'
    ];

    if (!item.slot || !validSlots.includes(item.slot)) {
        return {
            ok: false,
            message: '❌ Este item não pode ser equipado.'
        };
    }

    const slot = item.slot;
    const current = player.equipment[slot];

    if (
        current &&
        getItemId(current) === getItemId(item)
    ) {
        return {
            ok: false,
            message: '⚠️ Este item já está equipado.'
        };
    }

    if (current) {
        player.inventory.push({
            ...current,
            __equipped: false
        });
    }

    player.inventory.splice(itemIndex, 1);

    player.equipment[slot] = {
        ...item,
        __equipped: true
    };

    recalculateStats(player);

    if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
    }

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

    const soulIndex = player.soulsInventory.findIndex(
        soul =>
            soul &&
            String(
                soul.instanceId || soul.id
            ) === String(soulId)
    );

    if (soulIndex === -1) {
        return {
            ok: false,
            message: '❌ Alma não encontrada.'
        };
    }

    const emptySlot =
        player.soulsEquipped.findIndex(
            soul => !soul
        );

    if (emptySlot === -1) {
        return {
            ok: false,
            message: '❌ Slots cheios.'
        };
    }

    const soul =
        player.soulsInventory[soulIndex];

    player.soulsInventory.splice(
        soulIndex,
        1
    );

    player.soulsEquipped[emptySlot] = soul;

    recalculateStats(player);

    if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
    }

    return {
        ok: true,
        soul
    };
}

/*
=================================
COMMANDS
=================================
*/

async function handleEquip(ctx) {
    try {
        const text =
            ctx.message?.text || '';

        const itemId = text
            .split(' ')
            .slice(1)
            .join(' ')
            .trim();

        if (!itemId) {
            return ctx.reply(
                '❌ Informe o ID do item.'
            );
        }

        const player =
            await getPlayer(ctx.from.id);

        const result = equipItemById(
            player,
            itemId
        );

        if (!result.ok) {
            return ctx.reply(result.message);
        }

        await savePlayer(
            ctx.from.id,
            player
        );

        return ctx.reply(
            `⚔️ *${result.item.name} equipado!*`,
            {
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error(
            'Erro ao equipar:',
            error
        );

        return ctx.reply(
            '❌ Erro ao equipar item.'
        );
    }
}

async function handleEquipSoulCommand(ctx) {
    try {
        const text =
            ctx.message?.text || '';

        const soulId = text
            .split(' ')
            .slice(1)
            .join(' ')
            .trim();

        if (!soulId) {
            return ctx.reply(
                '❌ Informe a alma.'
            );
        }

        const player =
            await getPlayer(ctx.from.id);

        const result = equipSoulById(
            player,
            soulId
        );

        if (!result.ok) {
            return ctx.reply(result.message);
        }

        await savePlayer(
            ctx.from.id,
            player
        );

        return ctx.reply(
            `💀 *${result.soul.name} equipada!*`,
            {
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error(
            'Erro ao equipar alma:',
            error
        );

        return ctx.reply(
            '❌ Erro ao equipar alma.'
        );
    }
}

module.exports = {
    handleEquip,
    handleEquipSoulCommand,
    equipItemById,
    equipSoulById
};