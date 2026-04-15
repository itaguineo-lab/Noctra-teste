const { addCosmeticToPlayer, ensureCosmeticsState } = require('../player/cosmetics');
const {
    addInventoryItem,
    addGold,
    removeGold,
    addNox,
    removeNox,
    addGlorias,
    removeGlorias,
    addKeys,
    restoreEnergy,
    normalizePlayerForSave
} = require('../player/playerMutations');

function ensurePlayerEconomy(player) {
    if (!player) throw new Error('Player inválido.');

    player.gold ??= 0;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.inventory ??= [];

    player.consumables ??= {
        potionHp: 0,
        potionEnergy: 0,
        tonicStrength: 0,
        tonicDefense: 0
    };

    ensureCosmeticsState(player);
    player.vip ??= false;
    player.vipExpires ??= null;

    player.maxInventory ??= player.vip ? 30 : 20;
    player.keys ??= 0;
    player.energy ??= 20;
    player.maxEnergy ??= player.vip ? 40 : 20;

    return player;
}

function currencyLabel(currency) {
    const map = { gold: 'ouro', nox: 'Nox', glorias: 'glórias' };
    return map[currency] || currency;
}

function getBalance(player, currency) {
    return Number(player[currency] || 0);
}

function canPay(player, currency, price) {
    return getBalance(player, currency) >= price;
}

function pay(player, currency, price) {
    const value = Number(price) || 0;
    if (!canPay(player, currency, value)) return false;

    if (currency === 'gold') removeGold(player, value);
    else if (currency === 'nox') removeNox(player, value);
    else if (currency === 'glorias') removeGlorias(player, value);
    else player[currency] = Math.max(0, (player[currency] || 0) - value);

    return true;
}

function canProcessItem(player, item) {
    switch (item.type) {
        case 'equipment':
            return player.inventory.length < player.maxInventory;
        case 'cosmetic':
            return !player.cosmetics.some(c => c.id === item.id);
        default:
            return true;
    }
}

function addConsumable(player, item) {
    const key = item.effect;
    if (!key) return { success: false, message: '❌ Consumível inválido.' };

    player.consumables[key] = (player.consumables[key] || 0) + (item.value || 1);
    normalizePlayerForSave(player);

    return { success: true, message: `✅ ${item.name} comprado!` };
}

function addEquipment(player, item) {
    const equipment = {
        id: `${item.id}_${Date.now()}`,
        name: item.name,
        slot: item.slot,
        atk: item.atk || 0,
        def: item.def || 0,
        hp: item.hp || 0,
        crit: item.crit || 0,
        rarity: item.rarity || 'Raro',
        emoji: item.emoji || '⚔️',
        level: item.level || 1,
        classRestriction: item.classRestriction || null
    };

    const result = addInventoryItem(player, equipment);
    if (!result.success) {
        return { success: false, message: `❌ ${result.message}` };
    }

    normalizePlayerForSave(player);
    return { success: true, message: `✅ ${item.name} comprado!` };
}

function applyVip(player, item) {
    const now = Date.now();
    const currentExpire = player.vipExpires ? new Date(player.vipExpires).getTime() : now;
    const baseTime = Math.max(now, currentExpire);
    const newExpire = baseTime + item.days * 24 * 60 * 60 * 1000;

    player.vip = true;
    player.vipExpires = new Date(newExpire).toISOString();
    player.maxEnergy = 40;
    player.maxInventory = 30;
    player.energy = Math.min(player.maxEnergy, player.energy || player.maxEnergy);

    normalizePlayerForSave(player);
    return { success: true, message: `✨ VIP ativado por ${item.days} dias!` };
}

function addCosmetic(player, item) {
    const result = addCosmeticToPlayer(player, {
        id: item.id,
        name: item.name,
        type: item.cosmeticType || item.typeName || item.skinType || item.slot || 'badge'
    });

    if (!result.success) return result;

    normalizePlayerForSave(player);
    return { success: true, message: `✨ ${item.name} desbloqueado!` };
}

function addEnergyRefill(player, item) {
    const amount = item.value || 10;
    restoreEnergy(player, amount);
    normalizePlayerForSave(player);
    return { success: true, message: `⚡ +${amount} energia` };
}

function addKey(player, item) {
    const amount = item.value || 1;
    addKeys(player, amount);
    normalizePlayerForSave(player);
    return { success: true, message: `🗝️ +${amount} chave(s)` };
}

function processPurchase(player, item) {
    ensurePlayerEconomy(player);

    if (!item) return { success: false, message: '❌ Item inválido.' };

    if (!canPay(player, item.currency, item.price)) {
        return { success: false, message: `❌ Saldo insuficiente em ${currencyLabel(item.currency)}.` };
    }

    if (!canProcessItem(player, item)) {
        return {
            success: false,
            message: item.type === 'equipment'
                ? '❌ Inventário cheio.'
                : '❌ Você já possui este item.'
        };
    }

    let result;
    switch (item.type) {
        case 'consumable':
            if (item.effect === 'energyRefill') result = addEnergyRefill(player, item);
            else if (item.effect === 'keys') result = addKey(player, item);
            else result = addConsumable(player, item);
            break;
        case 'equipment':
            result = addEquipment(player, item);
            break;
        case 'vip':
            result = applyVip(player, item);
            break;
        case 'cosmetic':
            result = addCosmetic(player, item);
            break;
        default:
            return { success: false, message: '❌ Tipo inválido.' };
    }

    if (result.success) {
        const paid = pay(player, item.currency, item.price);
        if (!paid) {
            return { success: false, message: `❌ Falha ao processar pagamento em ${currencyLabel(item.currency)}.` };
        }
        normalizePlayerForSave(player);
    }

    return result;
}

/**
 * Calcula o valor de venda de um item (50% do valor base)
 * BALANCEAMENTO: Multiplicadores de raridade alinhados com os de atributos
 */
function calculateSellPrice(item) {
    if (!item) return 0;

    const atk = Number(item.atk) || 0;
    const def = Number(item.def) || 0;
    const hp = Number(item.hp) || 0;
    const crit = Number(item.crit) || 0;
    const power = atk * 2 + def * 2 + Math.floor(hp / 2) + crit * 3;

    const rarityMult = {
        Comum: 1.0,
        Incomum: 1.5,
        Raro: 2.2,
        Épico: 3.0,
        Lendário: 4.5,
        Mítico: 7.0
    }[item.rarity] || 1.0;

    const level = Number(item.level) || 1;
    const levelMult = 1 + (level - 1) * 0.2;

    const basePrice = Math.floor(power * rarityMult * levelMult * 2);
    return Math.max(1, Math.floor(basePrice * 0.5));
}

function sellItem(player, itemIndex) {
    ensurePlayerEconomy(player);

    if (!Array.isArray(player.inventory) || itemIndex < 0 || itemIndex >= player.inventory.length) {
        return { success: false, message: '❌ Item inválido.' };
    }

    const item = player.inventory[itemIndex];
    const sellPrice = calculateSellPrice(item);

    player.inventory.splice(itemIndex, 1);
    addGold(player, sellPrice);

    normalizePlayerForSave(player);

    return {
        success: true,
        message: `✅ ${item.name} vendido por ${sellPrice} ouro!`,
        sellPrice,
        itemName: item.name
    };
}

module.exports = {
    processPurchase,
    sellItem,
    calculateSellPrice
};