const { Markup } = require('telegraf');

const EQUIPMENT_CATEGORIES = {
    weapons: {
        label: '⚔️ Armas',
        shortLabel: 'Armas',
        slots: ['weapon']
    },
    offhands: {
        label: '🧤 Mão Sec.',
        shortLabel: 'Mão Secundária',
        slots: ['shield']
    },
    armors: {
        label: '🛡️ Armaduras',
        shortLabel: 'Armaduras',
        slots: ['armor']
    },
    boots: {
        label: '👢 Botas',
        shortLabel: 'Botas',
        slots: ['boots']
    },
    rings: {
        label: '💍 Anéis',
        shortLabel: 'Anéis',
        slots: ['ring']
    },
    necklaces: {
        label: '📿 Colares',
        shortLabel: 'Colares',
        slots: ['necklace']
    }
};

const UI_CATEGORIES = {
    equipment: {
        label: '⚔️ Equipamentos'
    },
    ...EQUIPMENT_CATEGORIES,
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

const LEGACY_CATEGORY_ALIAS = {
    shields: 'offhands',
    jewels: 'rings',
    jewelry: 'rings',
    armor: 'armors',
    weapon: 'weapons',
    shield: 'offhands',
    ring: 'rings',
    necklace: 'necklaces'
};

function normalizeCategoryKey(categoryKey = '') {
    const key = String(categoryKey || '').trim();
    return LEGACY_CATEGORY_ALIAS[key] || key;
}

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

function countEquipment(player = {}) {
    return Object.keys(EQUIPMENT_CATEGORIES).reduce((sum, categoryKey) => {
        return sum + getCategoryCount(player, categoryKey);
    }, 0);
}

function getCategoryCount(player, rawCategoryKey) {
    const categoryKey = normalizeCategoryKey(rawCategoryKey);

    if (categoryKey === 'equipment') return countEquipment(player);
    if (categoryKey === 'consumables') return sumConsumables(player);
    if (categoryKey === 'souls') return countSouls(player);
    if (categoryKey === 'skins') return countSkins(player);

    const category = UI_CATEGORIES[categoryKey];
    if (!category?.slots) return 0;
    return countItemsBySlots(player, category.slots);
}

function buildCategoryButton(player, rawCategoryKey, activeCategory = null) {
    const categoryKey = normalizeCategoryKey(rawCategoryKey);
    const activeKey = normalizeCategoryKey(activeCategory);
    const category = UI_CATEGORIES[categoryKey];

    if (!category) {
        return Markup.button.callback('❓ Inválido', 'inventory');
    }

    const count = getCategoryCount(player, categoryKey);
    const prefix = activeKey === categoryKey ? '⭐ ' : '';

    return Markup.button.callback(`${prefix}${category.label} (${count})`, `invcat:${categoryKey}`);
}

function buildInventoryCategoryRows(player = {}, activeCategory = null, includeMenuButton = true) {
    const rows = [
        [buildCategoryButton(player, 'equipment', activeCategory)],
        [
            buildCategoryButton(player, 'consumables', activeCategory),
            buildCategoryButton(player, 'souls', activeCategory)
        ],
        [
            buildCategoryButton(player, 'skins', activeCategory),
            Markup.button.callback('💰 Vender', 'shop_sell')
        ]
    ];

    if (includeMenuButton) {
        rows.push([Markup.button.callback('🏠 Menu', 'menu')]);
    }

    return rows;
}

function buildEquipmentCategoryRows(player = {}, activeCategory = null, includeBackButton = true) {
    const rows = [
        [
            buildCategoryButton(player, 'weapons', activeCategory),
            buildCategoryButton(player, 'offhands', activeCategory)
        ],
        [
            buildCategoryButton(player, 'armors', activeCategory),
            buildCategoryButton(player, 'boots', activeCategory)
        ],
        [
            buildCategoryButton(player, 'rings', activeCategory),
            buildCategoryButton(player, 'necklaces', activeCategory)
        ]
    ];

    if (includeBackButton) {
        rows.push([
            Markup.button.callback('◀️ Inventário', 'inventory'),
            Markup.button.callback('🏠 Menu', 'menu')
        ]);
    }

    return rows;
}

function inventoryMainMenu(player = {}, activeCategory = null) {
    return Markup.inlineKeyboard(buildInventoryCategoryRows(player, activeCategory, true));
}

function inventoryCategoryMenu(player = {}, activeCategory = null) {
    return inventoryMainMenu(player, activeCategory);
}

function equipmentCategoryMenu(player = {}, activeCategory = null) {
    return Markup.inlineKeyboard(buildEquipmentCategoryRows(player, activeCategory, true));
}

module.exports = {
    UI_CATEGORIES,
    EQUIPMENT_CATEGORIES,
    LEGACY_CATEGORY_ALIAS,
    inventoryMainMenu,
    inventoryCategoryMenu,
    equipmentCategoryMenu,
    buildInventoryCategoryRows,
    buildEquipmentCategoryRows,
    getRealSlot,
    countItemsBySlots,
    getCategoryCount,
    normalizeCategoryKey
};
