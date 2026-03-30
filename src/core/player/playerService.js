const fs = require('fs');
const path = require('path');

const playersFilePath = path.join(__dirname, '../../data/players.json');
let playersCache = null;

const BASE_STATS = {
  guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
  mago: { atk: 18, def: 4, hp: 80, crit: 8 },
  arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
};

function load() {
  if (playersCache) return;
  if (!fs.existsSync(playersFilePath)) {
    playersCache = {};
    return;
  }
  playersCache = JSON.parse(fs.readFileSync(playersFilePath, 'utf8'));
}

function save() {
  fs.writeFileSync(playersFilePath, JSON.stringify(playersCache, null, 2));
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
    inventory: [],
    soulsInventory: [],
    soulsEquipped: [null, null],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },
    energy: 20,
    maxEnergy: 20,
    hp: 0,
    maxHp: 0
  };

  recalculateStats(player);
  player.hp = player.maxHp;
  return player;
}

function getPlayer(id, name) {
  load();
  if (!playersCache[id]) {
    playersCache[id] = createDefaultPlayer(id, name);
    save();
  }
  return playersCache[id];
}

function savePlayer(id, player) {
  load();
  playersCache[id] = player;
  save();
}

function recalculateStats(player) {
  const base = BASE_STATS[player.class] || BASE_STATS.guerreiro;

  let atk = base.atk + (player.level - 1) * 3;
  let def = base.def + (player.level - 1) * 2;
  let maxHp = base.hp + (player.level - 1) * 20;
  let crit = base.crit;

  Object.values(player.equipment || {}).forEach(item => {
    if (!item) return;
    atk += item.atk || 0;
    def += item.def || 0;
    maxHp += item.hp || 0;
    crit += item.crit || 0;
  });

  player.atk = atk;
  player.def = def;
  player.maxHp = maxHp;
  player.crit = crit;

  return player;
}

module.exports = {
  getPlayer,
  savePlayer,
  recalculateStats,
  createDefaultPlayer
};