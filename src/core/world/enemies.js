const enemyPools = {
    clareira_sombria: {
        common: [
            { id: 'shadow_wolf', name: 'Lobo Sombrio', hp: 50, atk: 9, def: 4, xp: 30, gold: 18 },
            { id: 'giant_rat', name: 'Rato Gigante', hp: 40, atk: 7, def: 2, xp: 25, gold: 12 },
            { id: 'dark_boar', name: 'Javali Negro', hp: 55, atk: 8, def: 5, xp: 28, gold: 16 },
            { id: 'forest_spider', name: 'Aranha da Floresta', hp: 45, atk: 10, def: 3, xp: 26, gold: 15 },
            { id: 'night_bat', name: 'Morcego Noturno', hp: 35, atk: 11, def: 2, xp: 24, gold: 14 }
        ]
    },
    cripta_em_ruinas: {
        common: [
            { id: 'skeleton_warrior', name: 'Esqueleto Guerreiro', hp: 100, atk: 14, def: 8, xp: 45, gold: 28 },
            { id: 'skeleton_mage', name: 'Mago Esqueleto', hp: 90, atk: 18, def: 6, xp: 50, gold: 32 },
            { id: 'grave_hound', name: 'Cão da Cripta', hp: 95, atk: 16, def: 7, xp: 44, gold: 29 },
            { id: 'bone_archer', name: 'Arqueiro Ósseo', hp: 85, atk: 17, def: 5, xp: 46, gold: 30 },
            { id: 'crypt_guard', name: 'Guardião da Cripta', hp: 110, atk: 15, def: 9, xp: 48, gold: 31 }
        ]
    },
    pantano_corrompido: {
        common: [
            { id: 'corrupted_frog', name: 'Sapo Corrompido', hp: 130, atk: 20, def: 8, xp: 70, gold: 45 },
            { id: 'venom_serpent', name: 'Serpente Venenosa', hp: 120, atk: 24, def: 7, xp: 75, gold: 50 },
            { id: 'swamp_zombie', name: 'Zumbi do Lodo', hp: 140, atk: 19, def: 10, xp: 72, gold: 47 },
            { id: 'mud_golem', name: 'Golem de Lama', hp: 150, atk: 18, def: 12, xp: 78, gold: 52 },
            { id: 'toxic_crow', name: 'Corvo Tóxico', hp: 110, atk: 25, def: 6, xp: 73, gold: 49 }
        ]
    }
};

function getRandomEnemy(mapId) {
    const pool = enemyPools[mapId]?.common || enemyPools.clareira_sombria.common;
    return { ...pool[Math.floor(Math.random() * pool.length)], isBoss: false };
}

module.exports = { enemyPools, getRandomEnemy };