const { getPlayer, recalculateStats } = require('../core/player/playerService');
const { updateEnergy, getTimeToNextEnergy } = require('../services/energyService');
const { getXpToNextLevel } = require('../core/player/progression');
const { getMapById, maps } = require('../core/world/maps');
const { progressBar, formatNumber, formatTime } = require('./formatters');

function getPlayerSafe(id) {
  const player = getPlayer(id);
  updateEnergy(player);
  recalculateStats(player);
  return player;
}

function getActiveEvents() {
  const now = new Date();
  const month = now.getMonth();
  const events = [];

  if (month === 9) events.push('🎃 Halloween');
  if (month === 11) events.push('🎄 Natal');

  return events.length ? events.join(' | ') : 'Nenhum';
}

function getPlayerLocation(player) {
  return getMapById(player.currentMap) || maps[0];
}

function getMainMenuText(player, username) {
  const xpNeeded = getXpToNextLevel(player.level);
  const vipStatus = player.vip ? '✨ *VIP*' : '👤 Comum';
  const location = getPlayerLocation(player);
  const nextEnergyTime = getTimeToNextEnergy(player);
  const energyTimeStr = nextEnergyTime > 0 ? ` (próx. em ${formatTime(nextEnergyTime)})` : ' (cheia)';

  // Barras usando quadrados: 🟥 para HP, 🟨 para XP
  const hpBar = progressBar(player.hp, player.maxHp, 8, '🟥', '⬜');
  const xpBar = progressBar(player.xp, xpNeeded, 8, '🟨', '⬜');

  let text = `╔════════════════════════╗\n`;
  text += `║      🌙 *NOCTRA RPG*      ║\n`;
  text += `╠════════════════════════╣\n`;
  text += `║ 🤴 ${player.name || username} | ${vipStatus}\n`;
  text += `║ 🏹 Classe: ${player.class.charAt(0).toUpperCase() + player.class.slice(1)}\n`;
  text += `║ 🆙 Nível: ${player.level}\n`;
  text += `║ ⚔️ ATK ${player.atk}  🛡️ DEF ${player.def}  💥 CRIT ${player.crit}%\n`;
  text += `╠════════════════════════╣\n`;
  text += `║ ❤️ HP: ${player.hp}/${player.maxHp}\n`;
  text += `║ [${hpBar}]\n`;
  text += `╠════════════════════════╣\n`;
  text += `║ ✨ XP: ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}\n`;
  text += `║ [${xpBar}]\n`;
  text += `╠════════════════════════╣\n`;
  text += `║ ⚡ Energia: ${player.energy}/${player.maxEnergy}${energyTimeStr}\n`;
  text += `║ 💰 Ouro: ${formatNumber(player.gold || 0)} | 💎 Nox: ${formatNumber(player.nox || 0)}\n`;
  text += `╠════════════════════════╣\n`;
  text += `║ 🌍 Local: *${location.emoji} ${location.name}*\n`;
  text += `╚════════════════════════╝`;

  return text;
}

module.exports = {
  getPlayerSafe,
  getActiveEvents,
  getMainMenuText
};