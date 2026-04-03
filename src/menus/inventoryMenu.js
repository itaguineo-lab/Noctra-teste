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
            Markup.button.callback(`⚔️ Armas (${weapons})`, 'inv_weapon'),
            Markup.button.callback(`🛡️ Armaduras (${armors})`, 'inv_armor')
        ],
        [
            Markup.button.callback(`💍 Jóias (${jewelry})`, 'inv_jewelry'),
            Markup.button.callback(`🎨 Skins (${skins})`, 'inv_skin')
        ],
        [
            Markup.button.callback(`🧪 Consumíveis (${consumables})`, 'inv_consumable'),
            Markup.button.callback(`💀 Almas (${souls})`, 'inv_soul')
        ],
        [
            Markup.button.callback('✨ Auto equipar', 'auto_equip')
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