const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');
const { generateDrop } = require('../data/items');

function getMapNumber(mapName) {
    const maps = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4
    };

    return maps[mapName] || 1;
}

function processVictory(player, enemy) {
    if (!player.inventory) player.inventory = [];
    if (!player.soulsInventory) player.soulsInventory = [];

    const xp = enemy.xp || 0;
    const gold = enemy.gold || 0;

    player.gold = (player.gold || 0) + gold;
    addXp(player, xp);

    const loot = [];
    let droppedItem = null;

    const equipmentChance = enemy.isBoss ? 1 : 0.25;

    if (Math.random() < equipmentChance) {
        const mapNumber = getMapNumber(player.currentMap);
        droppedItem = generateDrop(mapNumber);

        if (player.inventory.length < (player.maxInventory || 20)) {
            player.inventory.push(droppedItem);
            loot.push(
                `🎁 ${droppedItem.name} [Lv${droppedItem.level}]\n` +
                `⚔️ ${droppedItem.atk} | 🛡️ ${droppedItem.def} | ❤️ ${droppedItem.hp} | 💥 ${droppedItem.crit}%`
            );
        }
    }

    return {
        xp,
        gold,
        loot,
        droppedItem
    };
}

module.exports = { processVictory };