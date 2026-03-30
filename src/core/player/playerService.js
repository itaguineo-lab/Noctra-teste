const fs = require('fs');
const path = require('path');

const playersFilePath = path.join(__dirname, '../../data/players.json');

// Cache em memória: { playerId: playerObject }
let playersCache = null;
let saveTimeout = null;

const BASE_STATS = {
    guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
    mago: { atk: 18, def: 4, hp: 80, crit: 8 },
    arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
};

function loadPlayersToCache() {
    try {
        if (!fs.existsSync(playersFilePath)) {
            playersCache = {};
            return;
        }
        const data = fs.readFileSync(playersFilePath, 'utf8');
        playersCache = JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        playersCache = {};
    }
}

function flushCacheToDisk() {
    if (!playersCache) return;
    try {
        fs.writeFileSync(playersFilePath, JSON.stringify(playersCache, null, 2));
    } catch (error) {
        console.error('Erro ao salvar jogadores:', error);
    }
}

function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        flushCacheToDisk();
        saveTimeout = null;
    }, 2000); // salva no disco a cada 2 segundos sem atividade
}

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
            accessory: null,
            boots: null,
            necklace: null,
            ring: null
        },
        keys: 0, vip: false, vipExpires: null,
        renamed: false, classChanged: false,
        createdAt: Date.now(), updatedAt: Date.now()
    };
    recalculateStats(player);
    player.hp = player.maxHp;
    return player;
}

function getPlayer(id, name) {
    if (playersCache === null) {
        loadPlayersToCache();
    }
    if (!playersCache[id]) {
        playersCache[id] = createDefaultPlayer(id, name);
        scheduleSave();
    }
    return playersCache[id];
}

function savePlayer(id, player) {
    if (playersCache === null) {
        loadPlayersToCache();
    }
    playersCache[id] = player;
    scheduleSave();
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
        });
    }

    if (player.souls && Array.isArray(player.souls)) {
        player.souls.forEach(soul => {
            if (!soul) return;
            if (soul.effect && soul.effect.type === 'passive') {
                if (soul.effect.atkBonus) atk += soul.effect.atkBonus;
                if (soul.effect.defBonus) def += soul.effect.defBonus;
                if (soul.effect.hpBonus) maxHp += soul.effect.hpBonus;
                if (soul.effect.critBonus) crit += soul.effect.critBonus;
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

// Salva tudo ao encerrar o processo
process.once('beforeExit', () => flushCacheToDisk());
process.once('SIGINT', () => flushCacheToDisk());
process.once('SIGTERM', () => flushCacheToDisk());

module.exports = { getPlayer, savePlayer, recalculateStats, createDefaultPlayer };
