const { addCosmeticToPlayer, ensureCosmeticsState } = require('../player/cosmetics');
const { BALANCE } = require('../../data/balance');

const {
    addInventoryItem,
    addGold,
    removeGold,
    removeNox,
    removeGlorias,
    addKeys,
    restoreEnergy,
    normalizePlayerForSave,
    getItemKey,
    normalizeInventoryItem,
    getUiCategoryFromSlot
} = require('../player/playerMutations');

const {
    isVipActive,
    normalizeVipState
} = require('../player/playerService');

const {
    recordPurchaseMetrics,
    recordSaleMetrics
} = require('../metrics/metricsService');

function getExpectedMaxInventory(player) {
    const bonusInventory = Number(player?.bonusInventory || 0);

    return (isVipActive(player)
        ? BALANCE.inventory.vipMax
        : BALANCE.inventory.baseMax) + bonusInventory;
}

function getExpectedMaxEnergy(player) {
    return isVipActive(player)
        ? BALANCE.energy.vipMax
        : BALANCE.energy.baseMax;
}

function getDisplayCategoryLabel(slot) {
    const labels = {
        weapon: 'Arma',
        shield: 'Armadura',
        armor: 'Armadura',
        boots: 'Armadura',
        ring: 'Joia',
        necklace: 'Joia'
    };

    return labels[slot] || 'Item';
}

function ensurePlayerEconomy(player) {
    if (!player) throw new Error('Player inválido.');

    player.gold ??= 0;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.inventory ??= [];
    player.keys ??= 0;
    player.vip ??= false;
    player.vipExpires ??= null;
    player.bonusInventory ??= 0;

    normalizeVipState(player);

    player.consumables ??= {
        potionHp: 0,
        potionEnergy: 0,
        tonicStrength: 0,
        tonicDefense: 0
    };

    ensureCosmeticsState(player);

    player.maxInventory = getExpectedMaxInventory(player);
    player.maxEnergy = getExpectedMaxEnergy(player);

    if (!Number.isFinite(Number(player.energy))) {
        player.energy = player.maxEnergy;
    }

    player.energy = Math.max(0, Math.min(player.energy, player.maxEnergy));

    return player;
}

function currencyLabel(currency) {
    const map = {
        gold: 'ouro',
        nox: 'Nox',
        glorias: 'glórias'
    };

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

    if (currency === 'gold') {
        removeGold(player, value);
    } else if (currency === 'nox') {
        removeNox(player, value);
    } else if (currency === 'glorias') {
        removeGlorias(player, value);
    } else {
        player[currency] = Math.max(0, (player[currency] || 0) - value);
    }

    return true;
}

function refund(player, currency, amount) {
    const value = Number(amount) || 0;

    if (currency === 'gold') {
        addGold(player, value);
    } else if (currency === 'nox') {
        player.nox = (player.nox || 0) + value;
    } else if (currency === 'glorias') {
        player.glorias = (player.glorias || 0) + value;
    } else {
        player[currency] = (player[currency] || 0) + value;
    }

    return player;
}

function canProcessItem(player, item, quantity = 1) {
    switch (item.type) {
        case 'equipment':
            return player.inventory.length + quantity <= player.maxInventory;

        case 'cosmetic':
            return !player.cosmetics.some(c => c.id === item.id);

        default:
            return true;
    }
}

function addConsumable(player, item, quantity = 1) {
    const key = item.effect;
    if (!key) {
        return { success: false, message: '❌ Consumível inválido.' };
    }

    const total = (item.value || 1) * quantity;
    player.consumables[key] = (player.consumables[key] || 0) + total;

    normalizePlayerForSave(player);

    return {
        success: true,
        message: `✅ ${item.name} x${quantity} comprado!`
    };
}

function buildPurchasedEquipment(item, index = 0) {
    const timestamp = Date.now();
    const raw = {
        id: `${item.id}_${timestamp}_${index}`,
        instanceId: `${item.id}_${timestamp}_${index}`,
        name: item.name,
        slot: item.slot,
        atk: item.atk || 0,
        def: item.def || 0,
        hp: item.hp || 0,
        crit: item.crit || 0,
        rarity: item.rarity || 'Raro',
        emoji: item.emoji || '⚔️',
        level: item.level || 1,
        classRestriction: item.classRestriction || null,
        category: item.category || undefined,
        uiCategory: item.uiCategory || (item.slot ? getUiCategoryFromSlot(item.slot) : undefined),
        displayCategory: item.displayCategory || getDisplayCategoryLabel(item.slot)
    };

    return normalizeInventoryItem(raw);
}

function addEquipment(player, item, quantity = 1) {
    if (!item.slot) {
        return { success: false, message: '❌ Equipamento inválido: slot ausente.' };
    }

    let lastEquipment = null;

    for (let i = 0; i < quantity; i++) {
        const equipment = buildPurchasedEquipment(item, i);
        const result = addInventoryItem(player, equipment);
        if (!result.success) {
            return { success: false, message: `❌ ${result.message}` };
        }
        lastEquipment = result.item;
    }

    normalizePlayerForSave(player);

    const categoryLabel = lastEquipment?.displayCategory || getDisplayCategoryLabel(lastEquipment?.slot);

    return {
        success: true,
        message: `✅ ${item.name} x${quantity} comprado! (${categoryLabel})`
    };
}

function applyVip(player, item) {
    const oldMaxEnergy = getExpectedMaxEnergy(player);
    const now = Date.now();
    const currentExpire = player.vipExpires ? new Date(player.vipExpires).getTime() : now;
    const baseTime = Math.max(now, currentExpire);
    const newExpire = baseTime + item.days * 24 * 60 * 60 * 1000;

    player.vip = true;
    player.vipExpires = new Date(newExpire).toISOString();

    const newMaxEnergy = BALANCE.energy.vipMax;
    const oldEnergy = Number(player.energy || 0);

    player.maxEnergy = newMaxEnergy;

    /*
    Compra de VIP deve gerar benefício perceptível instantâneo,
    não só promessa futura.
    */
    if (oldMaxEnergy < newMaxEnergy) {
        const diff = newMaxEnergy - oldMaxEnergy;
        player.energy = Math.min(newMaxEnergy, oldEnergy + diff);
    } else {
        player.energy = Math.min(newMaxEnergy, oldEnergy);
    }

    player.maxInventory = getExpectedMaxInventory(player);

    normalizePlayerForSave(player);

    return {
        success: true,
        message: `✨ VIP ativado por ${item.days} dias!`
    };
}

function addCosmetic(player, item) {
    const result = addCosmeticToPlayer(player, {
        id: item.id,
        name: item.name,
        type: item.cosmeticType || item.typeName || item.skinType || item.slot || 'badge'
    });

    if (!result.success) return result;

    normalizePlayerForSave(player);

    return {
        success: true,
        message: `✨ ${item.name} desbloqueado!`
    };
}

function addEnergyRefill(player, item, quantity = 1) {
    const amount = (item.value || 10) * quantity;
    restoreEnergy(player, amount);

    normalizePlayerForSave(player);

    return {
        success: true,
        message: `⚡ +${amount} energia`
    };
}

function addKey(player, item, quantity = 1) {
    const amount = (item.value || 1) * quantity;
    addKeys(player, amount);

    normalizePlayerForSave(player);

    return {
        success: true,
        message: `🗝️ +${amount} chave(s)`
    };
}

function executePurchaseEffect(player, item, quantity = 1) {
    switch (item.type) {
        case 'consumable':
            if (item.effect === 'energyRefill') return addEnergyRefill(player, item, quantity);
            if (item.effect === 'keys') return addKey(player, item, quantity);
            return addConsumable(player, item, quantity);

        case 'equipment':
            return addEquipment(player, item, quantity);

        case 'vip':
            return applyVip(player, item);

        case 'cosmetic':
            return addCosmetic(player, item);

        default:
            return { success: false, message: '❌ Tipo inválido.' };
    }
}

function canBuyMultiple(item) {
    return item?.type === 'consumable';
}

async function processPurchase(player, item, quantity = 1) {
    ensurePlayerEconomy(player);

    if (!item) {
        return { success: false, message: '❌ Item inválido.' };
    }

    const safeQuantity = Math.max(1, Number(quantity) || 1);

    if (safeQuantity > 1 && !canBuyMultiple(item)) {
        return {
            success: false,
            message: '❌ Este item não pode ser comprado em quantidade.'
        };
    }

    const unitPrice = Number(item.price || 0);
    if (unitPrice < 0) {
        return { success: false, message: '❌ Preço inválido.' };
    }

    const totalPrice = unitPrice * safeQuantity;

    if (!canPay(player, item.currency, totalPrice)) {
        return {
            success: false,
            message: `❌ Saldo insuficiente em ${currencyLabel(item.currency)}.`
        };
    }

    if (!canProcessItem(player, item, safeQuantity)) {
        return {
            success: false,
            message: item.type === 'equipment'
                ? '❌ Inventário cheio.'
                : '❌ Você já possui este item.'
        };
    }

    const paid = pay(player, item.currency, totalPrice);
    if (!paid) {
        return {
            success: false,
            message: `❌ Falha ao processar pagamento em ${currencyLabel(item.currency)}.`
        };
    }

    const result = executePurchaseEffect(player, item, safeQuantity);

    if (!result.success) {
        refund(player, item.currency, totalPrice);
        normalizePlayerForSave(player);
        return result;
    }

    normalizePlayerForSave(player);

    await recordPurchaseMetrics({
        currency: item.currency,
        amount: totalPrice,
        vip: item.type === 'vip'
    });

    return {
        ...result,
        quantity: safeQuantity,
        totalPrice
    };
}

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
    return Math.max(1, Math.floor(basePrice * 0.45));
}

function sellItem(player, itemIndex) {
    ensurePlayerEconomy(player);

    if (!Array.isArray(player.inventory) || itemIndex < 0 || itemIndex >= player.inventory.length) {
        return { success: false, message: '❌ Item inválido.' };
    }

    const item = player.inventory[itemIndex];
    const sellPrice = calculateSellPrice(item);
    const categoryLabel = item?.displayCategory || getDisplayCategoryLabel(item?.slot);

    player.inventory.splice(itemIndex, 1);
    addGold(player, sellPrice);

    normalizePlayerForSave(player);

    recordSaleMetrics({
        gold: sellPrice,
        items: 1
    }).catch(err => console.error('Erro ao registrar venda:', err));

    return {
        success: true,
        message: `✅ ${item.name} (${categoryLabel}) vendido por ${sellPrice} ouro!`,
        sellPrice,
        itemName: item.name
    };
}

function sellItemByKey(player, itemKey) {
    ensurePlayerEconomy(player);

    if (!Array.isArray(player.inventory) || !player.inventory.length) {
        return { success: false, message: '❌ Você não possui itens para vender.' };
    }

    const index = player.inventory.findIndex(item => getItemKey(item) === String(itemKey));
    if (index === -1) {
        return { success: false, message: '❌ Item não encontrado.' };
    }

    return sellItem(player, index);
}

module.exports = {
    processPurchase,
    sellItem,
    sellItemByKey,
    calculateSellPrice,
    canBuyMultiple
};