const Player = require('./PlayerModel');
const mongoose = require('mongoose');
const { ensureCosmeticsState } = require('./cosmetics');
const {
    preserveTransientStates,
    sanitizePlayerForPersistence
} = require('./playerSaveGuard');
const {
    ensureEnergyFields,
    syncEnergyCapacity,
    updateEnergy
} = require('../../services/energyService');
const { BALANCE } = require('../../data/balance');

let isConnected = false;

/*
=================================
MIGRAÇÃO DE ITENS ANTIGOS
=================================
*/

function migrateItemSlot(item) {
    if (!item || typeof item !== 'object') return item;

    const originalSlot = item.slot;
    if (!originalSlot) return item;

    const validSlots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];
    for (const validSlot of validSlots) {
        if (String(originalSlot).startsWith(validSlot) && originalSlot !== validSlot) {
            item.slot = validSlot;
            break;
        }
    }

    return item;
}

/*
=================================
BUFFS
=================================
*/

function updateBuffs(player) {
    if (!Array.isArray(player.buffs)) player.buffs = [];

    const now = Date.now();
    player.buffs = player.buffs.filter(buff => {
        if (!buff.expiresAt) return true;
        return Number(buff.expiresAt) > now;
    });

    return player;
}

/*
=================================
ACTIVE STATES
=================================
*/

function ensureActiveFightState(player) {
    player.activeFight ??= null;

    if (!player.activeFight) return player;

    player.activeFight.mode ??= 'hunt';
    player.activeFight.createdAt ??= Date.now();
    player.activeFight.expiresAt ??= player.activeFight.createdAt + (10 * 60 * 1000);
    player.activeFight.battleMessageId ??= null;
    player.activeFight.isPhoto ??= false;
    player.activeFight.payload ??= null;

    return player;
}

function ensureActiveArenaBattleState(player) {
    player.activeArenaBattle ??= null;

    if (!player.activeArenaBattle) return player;

    player.activeArenaBattle.mode ??= 'arena';
    player.activeArenaBattle.createdAt ??= Date.now();
    player.activeArenaBattle.expiresAt ??= player.activeArenaBattle.createdAt + (10 * 60 * 1000);
    player.activeArenaBattle.messageId ??= null;
    player.activeArenaBattle.payload ??= null;

    return player;
}

/*
=================================
ESTADO PADRÃO
=================================
*/

function ensurePlayerState(player) {
    if (!player) return {};
    if (!player.id) throw new Error('Player sem ID');

    player.name ??= 'Viajante';
    player.class ??= 'guerreiro';

    player.level ??= 1;
    player.xp ??= 0;

    player.gold ??= 100;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.keys ??= 0;

    player.vip ??= false;
    player.vipExpires ??= null;

    ensureEnergyFields(player);
    syncEnergyCapacity(player);

    player.inventory ??= [];
    player.inventory = player.inventory.map(migrateItemSlot);

    player.bonusInventory ??= 0;
    const baseInventory = player.vip ? BALANCE.inventory.vipMax : BALANCE.inventory.baseMax;
    player.maxInventory = baseInventory + (player.bonusInventory || 0);

    player.consumables ??= {
        potionHp: 0,
        potionEnergy: 0,
        tonicStrength: 0,
        tonicDefense: 0
    };

    player.buffs ??= [];
    player.equipment ??= {};

    const slots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];
    slots.forEach(slot => {
        if (!(slot in player.equipment)) player.equipment[slot] = null;
        if (player.equipment[slot]) {
            player.equipment[slot] = migrateItemSlot(player.equipment[slot]);
        }
    });

    player.soulsInventory ??= [];
    player.soulsEquipped ??= [null, null];

    player.totalKills ??= 0;
    player.achievements ??= {};

    player.currentMap ??= 'clareira_sombria';
    player.dungeonProgress ??= null;
    player.lastDungeonRun ??= 0;
    player.soulPityCounter ??= 0;

    player.arena ??= null;

    ensureCosmeticsState(player);
    player.lastDailyChest ??= null;

    player.renamed ??= false;
    player.classChanged ??= false;

    ensureActiveFightState(player);
    ensureActiveArenaBattleState(player);

    player.createdAt ??= new Date();
    player.updatedAt ??= new Date();

    player.hp ??= 120;
    player.maxHp ??= 120;
    player.atk ??= 12;
    player.def ??= 10;
    player.crit ??= 5;

    return player;
}

/*
=================================
RECALCULAR STATS
=================================
*/

function recalculateStats(player) {
    const BASE_STATS = {
        guerreiro: { atk: 12, def: 10, hp: 120, crit: 5 },
        mago: { atk: 18, def: 4, hp: 80, crit: 8 },
        arqueiro: { atk: 15, def: 6, hp: 100, crit: 10 }
    };

    ensurePlayerState(player);
    updateBuffs(player);

    const currentHp