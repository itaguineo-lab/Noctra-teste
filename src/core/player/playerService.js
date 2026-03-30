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

function loadPlayersToCache() {
  try {
    if (!fs.existsSync(playersFilePath)) {
      playersCache = {};
      return;
    }

    const data = fs.readFileSync(playersFilePath, 'utf8');
    playersCache = JSON.parse(data || '{}');
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
  }, 1200);
}

function normalizeSouls(player) {
  if (!Array.isArray(player.soulsInventory)) {
    player.soulsInventory = Array.isArray(player.souls) && player.souls.length && player.souls[0]?.id ? [...player.souls] : [];
  }

  if (!Array.isArray(player.soulsEquipped)) {
    player.soulsEquipped = [null, null];
  }

  if (!Array.isArray(player.souls)) {
    player.souls = player.soulsEquipped;
  }

  if (player.souls.length !== 2) {
    player.souls = [player.souls[0] || null, player.souls[1] || null];
  }

  return player;
}

function createDefaultPlayer(id, name = 'Viajante') {
  const player = {
    id,
    name,
    class: 'guerreiro',
    level: 1,
    xp: 0,
    gold: 100,
    nox: 0,
    glorias: 0,
    currentMap: 'clareira_sombria',
    hp: 0,
    maxHp: 0,
    atk: 0,
    def: 0,
    crit: 5,
    energy: 20,
    maxEnergy: 20,
    inventory: [],
    consumables: {},
    soulsInventory: [],
    soulsEquipped: [null, null],
    souls: [null, null],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
      boots: null,
      necklace: null,
      ring: null
    },
    keys: 0,
    vip: false,
    vipExpires: null,
    renamed: false,
    classChanged: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  recalculateStats(player);
  player.hp = player.maxHp;
  return normalizeSouls(player);
}

function ensurePlayerState(player) {
  if (!player || typeof player !== 'object') {
    throw new Error('Player inválido.');
  }

  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (!player.consumables || typeof player.consumables !== 'object') player.consumables = {};
  if (!player.equipment || typeof player.equipment !== 'object') {
    player.equipment = {
      weapon: null,
      armor: null,
      accessory: null,
      boots: null,
      necklace: null,
      ring: null
    };
  }

  if (typeof player.keys !== 'number' || Number.isNaN(player.keys)) player.keys = 0;
  if (typeof player.nox !== 'number' || Number.isNaN(player.nox)) player.nox = 0;
  if (typeof player.gold !== 'number' || Number.isNaN(player.gold)) player.gold = 0;
  if (typeof player.maxEnergy !== 'number' || Number.isNaN(player.maxEnergy)) player.maxEnergy = player.vip ? 40 : 20;
  if (typeof player.energy !== 'number' || Number.isNaN(player.energy)) player.energy = player.maxEnergy;
  if (typeof player.maxInventory !== 'number' || Number.isNaN(player.maxInventory)) player.maxInventory = player.vip ? 30 : 20;
  if (typeof player.vip !== 'boolean') player.vip = false;
  if (!player.vipExpires) player.vipExpires = null;
  if (typeof player.level !== 'number' || Number.isNaN(player.level) || player.level < 1) player.level = 1;
  if (typeof player.xp !== 'number' || Number.isNaN(player.xp) || player.xp < 0) player.xp = 0;
  if (typeof player.hp !== 'number' || Number.isNaN(player.hp) || player.hp < 0) player.hp = 0;
  if (!player.currentMap) player.currentMap = 'clareira_sombria';

  normalizeSouls(player);
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

  return ensurePlayerState(playersCache[id]);
}

function savePlayer(id, player) {
  if (playersCache === null) {
    loadPlayersToCache();
  }

  playersCache[id] = ensurePlayerState(player);
  playersCache[id].updatedAt = Date.now();
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

process.once('beforeExit', () => flushCacheToDisk());
process.once('SIGINT', () => flushCacheToDisk());
process.once('SIGTERM', () => flushCacheToDisk());

module.exports = {
  getPlayer,
  savePlayer,
  recalculateStats,
  createDefaultPlayer,
  ensurePlayerState,
  flushCacheToDisk
};
