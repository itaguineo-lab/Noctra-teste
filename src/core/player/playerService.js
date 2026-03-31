const BASE_STATS = {
    guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
    mago: { atk: 18, def: 4, hp: 80, crit: 8 },
    arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
};

function createDefaultPlayer(id, name = 'Viajante') {
    const player = {
        id, name, class: 'guerreiro', level: 1, xp: 0,
        gold: 100, nox: 0, glorias: 0,
        currentMap: 'clareira_sombria',
        hp: 0, maxHp: 0, atk: 0, def: 0, crit: 5,
        energy: 20, maxEnergy: 20,
        inventory: [],
        souls: [null, null],
        equipment: {
            weapon: null,
            armor: null,
            shield: null,
            ring: null,
            necklace: null,
            quiver: null,    // para arqueiro (pode dar bônus de crítico)
            backpack: null   // aumenta slots de inventário
        },
        keys: 0, vip: false, vipExpires: null,
        renamed: false, classChanged: false,
        createdAt: Date.now(), updatedAt: Date.now()
    };
    recalculateStats(player);
    player.hp = player.maxHp;
    return player;
}

function recalculateStats(player) {
    const base = BASE_STATS[player.class] || BASE_STATS.guerreiro;
    let atk = base.atk + (player.level - 1) * 3;
    let def = base.def + (player.level - 1) * 2;
    let maxHp = base.hp + (player.level - 1) * 20;
    let crit = base.crit;

    if (player.equipment) {
        Object.values(player.equipment).forEach(item => {
            if (!item) return;
            atk += item.atk || 0;
            def += item.def || 0;
            maxHp += item.hp || 0;
            crit += item.crit || 0;
            if (item.slot === 'backpack' && item.inventoryBonus) {
                player.maxInventory = (player.maxInventory || 20) + item.inventoryBonus;
            }
        });
    }

    player.atk = Math.max(1, atk);
    player.def = Math.max(0, def);
    player.maxHp = Math.max(10, maxHp);
    player.crit = Math.min(50, crit);
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    return player;
}