const { getPlayer, savePlayer, recalculateStats } = require('../core/player/playerService');

async function handleEquip(ctx) {
  try {
    const text = ctx.message?.text || '';
    const itemId = ctx.match?.[1] || text.split(' ').slice(1).join(' ').trim();

    if (!itemId) {
      return ctx.reply('❌ ID do item inválido.');
    }

    const player = getPlayer(ctx.from.id);
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!player.equipment) {
      player.equipment = { weapon: null, armor: null, accessory: null, boots: null, necklace: null, ring: null };
    }

    const itemIndex = player.inventory.findIndex(item => item && String(item.id) === String(itemId));
    if (itemIndex === -1) {
      return ctx.reply('❌ Item não encontrado no inventário.');
    }

    const item = player.inventory[itemIndex];
    if (!item.slot || !['weapon', 'armor', 'accessory'].includes(item.slot)) {
      return ctx.reply('❌ Este item não pode ser equipado.');
    }

    const currentEquip = player.equipment[item.slot];
    if (currentEquip) {
      player.inventory.push(currentEquip);
    }

    player.equipment[item.slot] = item;
    player.inventory.splice(itemIndex, 1);
    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    savePlayer(ctx.from.id, player);

    await ctx.reply(`⚔️ *Equipado:* ${item.name}`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao equipar:', error);
    await ctx.reply('❌ Erro ao equipar item.');
  }
}

async function handleEquipSoul(ctx) {
  try {
    const text = ctx.message?.text || '';
    const soulId = ctx.match?.[1] || text.split(' ').slice(1).join(' ').trim();

    if (!soulId) {
      return ctx.reply('❌ Alma inválida.');
    }

    const player = getPlayer(ctx.from.id);
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];

    const soulIndex = player.soulsInventory.findIndex(soul => soul && String(soul.instanceId || soul.id) === String(soulId));
    if (soulIndex === -1) {
      return ctx.reply('❌ Alma não encontrada no inventário de almas.');
    }

    const emptySlot = player.soulsEquipped.findIndex(soul => !soul);
    if (emptySlot === -1) {
      return ctx.reply('❌ Slots de almas cheios.');
    }

    const soul = player.soulsInventory[soulIndex];
    player.soulsEquipped[emptySlot] = soul;
    player.souls = player.soulsEquipped;
    player.soulsInventory.splice(soulIndex, 1);

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    await ctx.reply(`💀 *Alma equipada:* ${soul.name}`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao equipar alma:', error);
    await ctx.reply('❌ Erro ao equipar alma.');
  }
}

module.exports = {
  handleEquip,
  handleEquipSoul
};