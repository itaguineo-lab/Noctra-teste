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
    const shields = countItemsBySlots(player, ['shield']);
    const armors = countItemsBySlots(player, ['armor']);
    const necklaces = countItemsBySlots(player, ['necklace']);
    const rings = countItemsBySlots(player, ['ring']);
    const boots = countItemsBySlots(player, ['boots']);
    const skins = (player.cosmetics || []).length;
    const consumables = sumConsumables(player);
    const souls = (player.soulsInventory || []).length;

    return Markup.inlineKeyboard([
        [
            Markup.button.callback(`⚔️ Armas (${weapons})`, 'invcat:weapons'),
            Markup.button.callback(`🛡️ Escudos (${shields})`, 'invcat:shields')
        ],
        [
            Markup.button.callback(`🥋 Armaduras (${armors})`, 'invcat:armors'),
            Markup.button.callback(`👢 Botas (${boots})`, 'invcat:boots')
        ],
        [
            Markup.button.callback(`📿 Amuletos (${necklaces})`, 'invcat:necklaces'),
            Markup.button.callback(`💍 Anéis (${rings})`, 'invcat:rings')
        ],
        [
            Markup.button.callback(`🧪 Consumíveis (${consumables})`, 'invcat:consumables'),
            Markup.button.callback(`💀 Almas (${souls})`, 'invcat:souls')
        ],
        [
            Markup.button.callback(`🎨 Skins (${skins})`, 'invcat:skins'),
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