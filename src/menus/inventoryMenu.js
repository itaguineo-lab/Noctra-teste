const { Markup } = require('telegraf');

function sumConsumables(player = {}) {
    const consumables = player.consumables || {};
    return Object.values(consumables).reduce((acc, value) => acc + (Number(value) || 0), 0);
}

function countItemsBySlots(player = {}, slots = []) {
    const items = player.inventory || [];
    return items.filter(item => slots.includes(item.slot)).length;
}

function inventoryMainMenu(player = {}) {
    const weapons = countItemsBySlots(player, ['weapon']);
    const armors = countItemsBySlots(player, ['armor']);
    const jewelry = countItemsBySlots(player, ['ring', 'necklace']);
    const skins = (player.cosmetics || []).length;
    const consumables = sumConsumables(player);
    const souls = (player.soulsInventory || []).length;

    return Markup.inlineKeyboard([
        [
            Markup.button.callback(`⚔️ Armas (${weapons})`, 'invcat:weapons'),
            Markup.button.callback(`🛡️ Armaduras (${armors})`, 'invcat:armors')
        ],
        [
            Markup.button.callback(`💎 Joias (${jewelry})`, 'invcat:jewelry'),
            Markup.button.callback(`🧪 Consumíveis (${consumables})`, 'invcat:consumables')
        ],
        [
            Markup.button.callback(`🎨 Skins (${skins})`, 'invcat:skins'),
            Markup.button.callback(`💀 Almas (${souls})`, 'invcat:souls')
        ],
        [
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

function inventoryCategoryMenu(player = {}) {
    return inventoryMainMenu(player);
}

module.exports = {
    inventoryMainMenu,
    inventoryCategoryMenu
};