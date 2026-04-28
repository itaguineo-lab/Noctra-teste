const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    applyEquipmentChange,
    applySoulEquip,
    normalizePlayerForSave,
    normalizeInventoryItem
} = require('../core/player/playerMutations');

const {
    getItemKey
} = require('../core/player/equipmentService');

const SOUL_SLOT_COUNT = 2;

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

    while (player.soulsEquipped.length < SOUL_SLOT_COUNT) {
        player.soulsEquipped.push(null);
    }

    player.soulsEquipped = player.soulsEquipped.slice(0, SOUL_SLOT_COUNT);

    return player;
}

function getItemIdentifiers(item) {
    if (!item) return [];

    return [
        String(item.instanceId || ''),
        String(item.id || ''),
        String(getItemKey(item) || '')
    ].filter(Boolean);
}

function getRealSlot(item) {
    const normalized = normalizeInventoryItem(item);
    return normalized?.slot || null;
}

function findInventoryItemByAnyIdentifier(player, rawIdentifier) {
    player = normalizePlayer(player);

    const target = String(rawIdentifier || '').trim();
    if (!target) return null;

    return player.inventory.find(entry => {
        const normalized = normalizeInventoryItem(entry);
        if (!normalized) return false;

        return getItemIdentifiers(normalized).includes(target);
    }) || null;
}

function getSoulKey(soul = {}) {
    return String(soul.instanceId || soul.id || '').trim();
}

function getSoulCommandId(soul = {}) {
    return String(soul.id || soul.instanceId || '').trim();
}

function normalizeSoulLookupKey(value = '') {
    return String(value || '').trim().toLowerCase();
}

function sameSoulKey(soul = {}, key = '') {
    const safeKey = normalizeSoulLookupKey(key);
    if (!safeKey) return false;

    return [soul.instanceId, soul.id]
        .map(normalizeSoulLookupKey)
        .filter(Boolean)
        .includes(safeKey);
}

function getEquippedSoulSlot(player, soulId) {
    player = normalizePlayer(player);
    const key = String(soulId || '').trim();
    return player.soulsEquipped.findIndex(soul => soul && sameSoulKey(soul, key));
}

function parseSoulSlotToken(value = '') {
    const token = String(value || '').trim().toLowerCase();
    if (!token) return null;

    const normalized = token
        .replace(/^slot[:_\-]?/, '')
        .replace(/^s/, '');

    if (normalized === '1') return 0;
    if (normalized === '2') return 1;
    return null;
}

function parseEquipSoulArgs(text = '') {
    const raw = String(text || '').trim();
    const args = raw.split(/\s+/).slice(1);

    if (!args.length) {
        return { soulId: '', slot: null };
    }

    const maybeSlot = parseSoulSlotToken(args[args.length - 1]);

    if (maybeSlot !== null) {
        return {
            soulId: args.slice(0, -1).join(' ').trim(),
            slot: maybeSlot
        };
    }

    return {
        soulId: args.join(' ').trim(),
        slot: null
    };
}

function getOwnedSoulEntries(player) {
    player = normalizePlayer(player);

    const inventory = player.soulsInventory.map((soul, index) => ({
        soul,
        location: 'collection',
        label: `Coleção #${index + 1}`,
        slot: null
    }));

    const equipped = player.soulsEquipped
        .map((soul, slot) => soul ? {
            soul,
            location: 'equipped',
            label: `Slot ${slot + 1}`,
            slot
        } : null)
        .filter(Boolean);

    return [...equipped, ...inventory];
}

function formatSoulCommandLine(entry) {
    const soul = entry?.soul || {};
    const id = getSoulCommandId(soul) || getSoulKey(soul) || 'sem_id';
    const name = soul.name || 'Alma sem nome';
    const status = entry?.location === 'equipped'
        ? `equipada no ${entry.label}`
        : entry?.label || 'coleção';

    return `• ${name} — ID: ${id} (${status})`;
}

function buildOwnedSoulHelp(player, max = 8) {
    const entries = getOwnedSoulEntries(player);

    if (!entries.length) {
        return (
            'Você ainda não possui nenhuma alma.\n\n' +
            'Para testar como admin, use:\n' +
            '`/give soul Admin soul_wolf`\n\n' +
            'Depois use:\n' +
            '`/equipsoul soul_wolf 1`'
        );
    }

    const lines = entries.slice(0, max).map(formatSoulCommandLine);
    const extra = entries.length > max ? `\n• +${entries.length - max} almas ocultas` : '';

    return (
        'Almas disponíveis:\n' +
        lines.join('\n') +
        extra +
        '\n\nUse, por exemplo:\n' +
        '`/equipsoul soul_wolf 1`\n' +
        '`/equipsoul soul_wolf 2`'
    );
}

function buildEquipSoulUsage(player = null) {
    const base = (
        'Uso correto:\n' +
        '`/equipsoul ID_DA_ALMA`\n' +
        '`/equipsoul ID_DA_ALMA 1`\n' +
        '`/equipsoul ID_DA_ALMA 2`\n\n' +
        'Exemplo real de ID base:\n' +
        '`/equipsoul soul_wolf 1`'
    );

    if (!player) return base;

    return `${base}\n\n${buildOwnedSoulHelp(player)}`;
}

function buildSoulNotFoundMessage(player, soulId) {
    const searched = String(soulId || '').trim();

    return (
        `❌ Alma não encontrada: ${searched || '—'}\n\n` +
        'O ID `inst_wolf` era só exemplo de teste. Use o ID real da alma que existe na sua coleção.\n\n' +
        buildOwnedSoulHelp(player)
    );
}

function equipSoulToExplicitSlot(player, soulId, slot) {
    player = normalizePlayer(player);

    const targetSlot = Number(slot);
    const key = String(soulId || '').trim();

    if (!key) {
        return { ok: false, message: '❌ Alma inválida.' };
    }

    if (!Number.isInteger(targetSlot) || targetSlot < 0 || targetSlot >= SOUL_SLOT_COUNT) {
        return { ok: false, message: '❌ Slot de alma inválido. Use 1 ou 2.' };
    }

    const alreadyEquippedSlot = getEquippedSoulSlot(player, key);

    if (alreadyEquippedSlot === targetSlot) {
        return {
            ok: true,
            soul: player.soulsEquipped[targetSlot],
            slot: targetSlot,
            replaced: null,
            unchanged: true,
            message: `Esta alma já está equipada no Slot ${targetSlot + 1}.`
        };
    }

    if (alreadyEquippedSlot >= 0) {
        return {
            ok: false,
            message: `❌ Esta alma já está equipada no Slot ${alreadyEquippedSlot + 1}. Desequipe antes de mover.`
        };
    }

    const soulIndex = player.soulsInventory.findIndex(entry => sameSoulKey(entry, key));

    if (soulIndex === -1) {
        return { ok: false, message: buildSoulNotFoundMessage(player, key) };
    }

    const [soul] = player.soulsInventory.splice(soulIndex, 1);
    const replaced = player.soulsEquipped[targetSlot] || null;

    if (replaced) {
        const replacedKey = getSoulKey(replaced);
        const alreadyStored = player.soulsInventory.some(entry => sameSoulKey(entry, replacedKey));
        if (!alreadyStored) player.soulsInventory.push(replaced);
    }

    player.soulsEquipped[targetSlot] = soul;
    normalizePlayerForSave(player);

    return {
        ok: true,
        soul,
        slot: targetSlot,
        replaced,
        message: replaced
            ? `${soul.name} equipada no Slot ${targetSlot + 1}. ${replaced.name} voltou para a coleção.`
            : `${soul.name} equipada no Slot ${targetSlot + 1}.`
    };
}

function equipItemById(player, itemId) {
    player = normalizePlayer(player);

    const item = findInventoryItemByAnyIdentifier(player, itemId);

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
        item: result.equipped
    };
}

function equipSoulById(player, soulId, slot = null) {
    player = normalizePlayer(player);

    if (slot !== null && slot !== undefined) {
        return equipSoulToExplicitSlot(player, soulId, slot);
    }

    const alreadyEquippedSlot = getEquippedSoulSlot(player, soulId);
    if (alreadyEquippedSlot >= 0) {
        return {
            ok: false,
            message: `❌ Esta alma já está equipada no Slot ${alreadyEquippedSlot + 1}.`
        };
    }

    const soul = player.soulsInventory.find(
        entry => entry && sameSoulKey(entry, soulId)
    );

    if (!soul) {
        return {
            ok: false,
            message: buildSoulNotFoundMessage(player, soulId)
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
        soul: result.soul,
        slot: result.slot,
        message: `${result.soul.name} equipada no Slot ${result.slot + 1}.`
    };
}

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
        const { soulId, slot } = parseEquipSoulArgs(ctx.message?.text || '');
        const player = await getPlayer(ctx.from.id);

        if (!player) {
            return ctx.reply('❌ Jogador não encontrado. Use /start.');
        }

        if (!soulId) {
            return ctx.reply(buildEquipSoulUsage(player), { parse_mode: 'Markdown' });
        }

        const result = equipSoulById(player, soulId, slot);

        if (!result.ok) {
            return ctx.reply(result.message, { parse_mode: 'Markdown' });
        }

        await savePlayer(ctx.from.id, player);

        return ctx.reply(`💀 *${result.message || `${result.soul.name} equipada!`}*`, {
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
    equipSoulById,
    equipSoulToExplicitSlot,
    parseEquipSoulArgs,
    parseSoulSlotToken,
    getEquippedSoulSlot,
    sameSoulKey,
    getSoulKey,
    getSoulCommandId,
    getOwnedSoulEntries,
    buildOwnedSoulHelp,
    buildEquipSoulUsage,
    buildSoulNotFoundMessage
};
