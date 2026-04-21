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

function buildCategoryButton(player, categoryKey, activeCategory = null) {
    const category = UI_CATEGORIES[categoryKey];
    const count = getCategoryCount(player, categoryKey);
    const isActive = activeCategory === categoryKey;
    const label = isActive
        ? `⭐ ${category.label}`
        : `${category.label}`;

    return Markup.button.callback(`${label}`, `invcat:${categoryKey}`);
}

function buildInventoryCategoryRows(player = {}, activeCategory = null, includeMenuButton = true) {
    const rows = [
        [
            buildCategoryButton(player, 'weapons', activeCategory),
            buildCategoryButton(player, 'armors', activeCategory)
        ],
        [
            buildCategoryButton(player, 'jewels', activeCategory),
            buildCategoryButton(player, 'consumables', activeCategory)
        ],
        [
            buildCategoryButton(player, 'skins', activeCategory),
            buildCategoryButton(player, 'souls', activeCategory)
        ]
    ];

    if (includeMenuButton) {
        rows.push([Markup.button.callback('🏠 Menu', 'menu')]);
    }

    return rows;
}

function inventoryMainMenu(player = {}, activeCategory = null) {
    return Markup.inlineKeyboard(buildInventoryCategoryRows(player, activeCategory, true));
}

function inventoryCategoryMenu(player = {}, activeCategory = null) {
    return inventoryMainMenu(player, activeCategory);
}

module.exports = {
    UI_CATEGORIES,
    inventoryMainMenu,
    inventoryCategoryMenu,
    buildInventoryCategoryRows,
    getRealSlot,
    countItemsBySlots,
    getCategoryCount
};