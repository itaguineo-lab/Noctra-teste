const fs = require('fs');
const path = require('path');

const playersFilePath = path.join(__dirname, '../../data/players.json');

let playersCache = null;
let saveTimeout = null;

const BASE_STATS = {
    guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
    mago: { atk: 18, def: 4, hp: 80, crit: 8 },
    arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
};

const EQUIPMENT_SLOTS = ['weapon', 'armor', 'necklace', 'ring', 'boots'];

// Atualiza buffs: decrementa remainingTurns e remove os expirados
function updateBuffs(player) {
    if (!player.buffs) player.buffs = [];
    player.buffs = player.buffs.filter(buff => {
        buff.remainingTurns--;
        return buff.remainingTurns > 0;
    });
    return player;
}

// Verifica e aplica/remove benefícios VIP conforme a data
function checkVipStatus(player) {
    const now = new Date();
    const vipExpires = player.vipExpires ? new Date(player.vipExpires) : null;

    const wasVip = player.vip;
    const isVip = vipExpires && vipExpires > now;

    if (isVip !== wasVip) {
        player.vip = isVip;

        if (isVip) {
            // Ativa benefícios
            player.maxEnergy = 40;
            player.bonusInventory = (player.bonusInventory || 0) + 10;
        } else {
            // Remove benefícios
            player.maxEnergy = 20;
            player.bonusInventory = Math.max(0, (player.bonusInventory || 0) - 10);
        }
        // Recalcula inventário máximo
        player.maxInventory = 20 + (player.bonusInventory || 0);
        if (player.energy > player.maxEnergy) player.energy = player.maxEnergy;
    }
    return player;
}

// Garante que o objeto do jogador tenha todos os campos necessários
function ensurePlayerState(player) {
    if (!player || typeof player !== 'object') return null;

    // Campos básicos
    player.id ??= player.id;
    player.name ??= 'Viajante';
    player.class ??= 'guerreiro';
    player.level ??= 1;
    player.xp ??= 0;
    player.gold ??= 100;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.keys ??= 0;

    // Energia
    player.maxEnergy ??= player.vip ? 40 : 20;
    player.energy ??= player.maxEnergy;
    player.lastEnergyUpdate ??= Date.now();

    // Inventário
    player.inventory ??= [];
    player.bonusInventory ??= 0;
    player.maxInventory = 20 + (player.bonusInventory || 0);
    player.consumables ??= { potionHp: 0, potionEnergy: 0, tonicStrength: 0, tonicDefense: 0 };

    // Buffs temporários
    player.buffs ??= [];

    // Equipamentos
    player.equipment ??= {};
    EQUIPMENT_SLOTS.forEach(slot => {
        if (!(slot in player.equipment)) player.equipment[slot] = null;
    });

    // Almas
    player.soulsInventory ??= [];
    player.soulsEquipped ??= [null, null];

    // Estatísticas
    player.totalKills ??= 0;
    player.achievements ??= {};
    player.lastActive ??= Date.now();

    // Mapa atual
    player.currentMap ??= 'clareira_sombria';

    // VIP
    player.vip ??= false;
    player.vipExpires ??= null;
    player.renamed ??= false;
    player.classChanged ??= false;

    // Datas
    player.createdAt ??= Date.now();
    player.updatedAt ??= Date.now();

    // Aplica estado VIP
    checkVipStatus(player);

    // Garantir HP/Stats
    if (!player.maxHp) recalculateStats(player);
    player.hp ??= player.maxHp;

    return player;
}

function loadPlayersToCache() {
    try {
        if (!fs.existsSync(playersFilePath)) {
            playersCache = {};
            return;
        }
        const data = fs.readFileSync(playersFilePath, 'utf8');
        playersCache = JSON.parse(data || '{}');
        Object.values(playersCache).forEach(p => ensurePlayerState(p));
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
    }, 1000);
}

function createDefaultPlayer(id, name = 'Viajante') {
    return ensurePlayerState({
        id,
        name,
        class: 'guerreiro',
        level: 1,
        xp: 0,
        gold: 100,
        nox: 0,
        glorias: 0,
        keys: 0,
        energy: 20,
        maxEnergy: 20,
        inventory: [],
        bonusInventory: 0,
        maxInventory: 20,
        consumables: { potionHp: 0, potionEnergy: 0, tonicStrength: 0, tonicDefense: 0 },
        buffs: [],
        equipment: {},
        soulsInventory: [],
        soulsEquipped: [null, null],
        totalKills: 0,
        achievements: {},
        currentMap: 'clareira_sombria',
        vip: false,
        vipExpires: null,
        renamed: false,
        classChanged: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActive: Date.now()
    });
}

function getPlayer(id, name = 'Viajante') {
    if (playersCache === null) loadPlayersToCache();

    if (!playersCache[id]) {
        playersCache[id] = createDefaultPlayer(id, name);
        scheduleSave();
    }

    const player = ensurePlayerState(playersCache[id]);
    player.lastActive = Date.now();
    return player;
}

function savePlayer(id, player) {
    if (playersCache === null) loadPlayersToCache();
    playersCache[id] = ensurePlayerState(player);
    playersCache[id].updatedAt = Date.now();
    playersCache[id].lastActive = Date.now();
    scheduleSave();
}

function recalculateStats(player) {
    const base = BASE_STATS[player.class] || BASE_STATS.guerreiro;

    let atk = base.atk + (player.level - 1) * 3;
    let def = base.def + (player.level - 1) * 2;
    let maxHp = base.hp + (player.level - 1) * 20;
    let crit = base.crit;

    // Equipamentos
    if (player.equipment) {
        Object.values(player.equipment).forEach(item => {
            if (!item) return;
            atk += item.atk || 0;
            def += item.def || 0;
            maxHp += item.hp || 0;
            crit += item.crit || 0;
        });
    }

    // Almas equipadas (efeitos passivos)
    if (Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped.forEach(soul => {
            if (!soul || !soul.effect) return;
            if (soul.effect.type === 'passive') {
                atk += soul.effect.atkBonus || 0;
                def += soul.effect.defBonus || 0;
                maxHp += soul.effect.hpBonus || 0;
                crit += soul.effect.critBonus || 0;
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

// Exporta a cache para uso em online.js
function getAllPlayers() {
    if (playersCache === null) loadPlayersToCache();
    return playersCache;
}

process.once('beforeExit', () => flushCacheToDisk());
process.once('SIGINT', () => flushCacheToDisk());
process.once('SIGTERM', () => flushCacheToDisk());

module.exports = {
    getPlayer,
    savePlayer,
    recalculateStats,
    createDefaultPlayer,
    ensurePlayerState,
    flushCacheToDisk,
    getAllPlayers,
    updateBuffs
};