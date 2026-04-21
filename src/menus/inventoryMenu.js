const { Markup } = require('telegraf');

const UI_CATEGORIES = {
    weapons: {
        label: '⚔️ Armas',
        slots: ['weapon']
    },
    armors: {
        label: '🛡️ Armaduras',
        slots: ['shield', 'armor', 'boots']
    },
    jewels: {
        label: '💎 Joias',
        slots: ['ring', 'necklace']
    },
    consumables: {
        label: '🧪 Consumíveis'
    },
    skins: {
        label: '🎨 Skins'
    },
    souls: {
        label: '💀 Almas'
    }
};

function getRealSlot(item = {}) {
    const slot = String(item.slot || '');
    const validSlots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const validSlot of validSlots) {
        if (slot.startsWith(validSlot)) return validSlot;
    }

    return slot;
}

function countItemsBySlots(player = {}, slots = []) {
    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const equipment = player.equipment || {};

    let total = inventory.filter(item => slots.includes(getRealSlot(item))).length;

    for (const slot of slots) {
        if (equipment[slot]) {
            total += 1;
        }
    }

    return total;
}

function sumConsumables(player = {}) {
    const consumables = player.consumables || {};
    return Object.values(consumables).reduce((acc, value) => acc + (Number(value) || 0), 0);
}

function countSouls(player = {}) {
    return (player.soulsInventory || []).length + (player.soulsEquipped || []).filter(Boolean).length;
}

function countSkins(player = {}) {
    return (player.cosmetics || []).length;
}

function getCategoryCount(player, categoryKey) {
    if (categoryKey === 'consumables') return sumConsumables(player);
    if (categoryKey === 'souls') return countSouls(player);
    if (categoryKey === 'skins') return countSkins(player);

    const category = UI_CATEGORIES[categoryKey];
    if (!category?.slots) return 0;
    return countItemsBySlots(player, category.slots);
}

function buildCategoryButton(player, categoryKey) {
    const category = UI_CATEGORIES[categoryKey];
    const count = getCategoryCount(player, categoryKey);
    return Markup.button.callback(`${category.label} (${count})`, `invcat:${categoryKey}`);
}

function inventoryMainMenu(player = {}) {
    return Markup.inlineKeyboard([
        [
            buildCategoryButton(player, 'weapons'),
            buildCategoryButton(player, 'armors')
        ],
        [
            buildCategoryButton(player, 'jewels'),
            buildCategoryButton(player, 'consumables')
        ],
        [
            buildCategoryButton(player, 'skins'),
            buildCategoryButton(player, 'souls')
        ],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

function inventoryCategoryMenu(player = {}) {
    return inventoryMainMenu(player);
}

module.exports = {
    UI_CATEGORIES,
    inventoryMainMenu,
    inventoryCategoryMenu,
    getRealSlot,
    countItemsBySlots,
    getCategoryCount
};