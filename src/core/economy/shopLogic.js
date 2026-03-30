function ensurePlayerEconomy(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    if (!Array.isArray(player.inventory)) {
        player.inventory = [];
    }

    if (!player.consumables || typeof player.consumables !== 'object') {
        player.consumables = {};
    }

    if (typeof player.keys !== 'number' || Number.isNaN(player.keys)) {
        player.keys = 0;
    }

    if (typeof player.nox !== 'number' || Number.isNaN(player.nox)) {
        player.nox = 0;
    }

    if (typeof player.gold !== 'number' || Number.isNaN(player.gold)) {
        player.gold = 0;
    }

    if (typeof player.maxEnergy !== 'number' || Number.isNaN(player.maxEnergy)) {
        player.maxEnergy = 20;
    }

    if (typeof player.energy !== 'number' || Number.isNaN(player.energy)) {
        player.energy = player.maxEnergy;
    }

    if (typeof player.maxInventory !== 'number' || Number.isNaN(player.maxInventory)) {
        player.maxInventory = 20;
    }

    if (typeof player.vip !== 'boolean') {
        player.vip = false;
    }

    if (!player.vipExpires) {
        player.vipExpires = null;
    }

    return player;
}

function getCurrencyLabel(currency) {
    const map = {
        gold: 'Ouro',
        nox: 'Nox',
        glory: 'Glórias',
        glories: 'Glórias'
    };

    return map[currency] || currency || 'moeda';
}

function getNumericPrice(item) {
    return Math.floor(Number(item?.price) || 0);
}

function getCurrentCurrency(player, currency) {
    return Math.floor(Number(player[currency]) || 0);
}

function canPay(player, currency, price) {
    return getCurrentCurrency(player, currency) >= price;
}

function pay(player, currency, price) {
    if (!canPay(player, currency, price)) {
        return false;
    }

    player[currency] = getCurrentCurrency(player, currency) - price;
    return true;
}

function addConsumable(player, item) {
    const qty = Math.floor(Number(item.quantity) || 1);
    const key = item.effectKey || inferConsumableKey(item.effect);

    if (!key) {
        return false;
    }

    player.consumables[key] = (player.consumables[key] || 0) + qty;
    return true;
}

function inferConsumableKey(effect) {
    const map = {
        hp: 'potionHp',
        energy: 'potionEnergy',
        buff_atk: 'tonicStrength',
        buff_def: 'tonicDefense',
        buff_crit: 'tonicPrecision'
    };

    return map[effect] || null;
}

function addEquipment(player, item) {
    player.inventory.push({
        id: `shop_${item.id}_${Date.now()}`,
        name: item.name,
        rarity: item.rarity || 'Comum',
        slot: item.slot || 'weapon',
        atk: item.atk || 0,
        def: item.def || 0,
        hp: item.hp || 0,
        crit: item.crit || 0
    });

    return true;
}

function addVip(player, item) {
    const days = Math.floor(Number(item.days) || 0);
    if (days <= 0) return false;

    const now = Date.now();
    const currentExpire = player.vipExpires
        ? new Date(player.vipExpires).getTime()
        : now;

    const base = Math.max(now, currentExpire);
    const newExpire = base + (days * 24 * 60 * 60 * 1000);

    player.vip = true;
    player.vipExpires = new Date(newExpire).toISOString();
    player.maxEnergy = 40;
    player.energy = Math.min(player.energy, player.maxEnergy);
    player.maxInventory += Number(item.bonusInventory || 10);

    return true;
}

function addKey(player, item) {
    const value = Math.floor(Number(item.value) || 1);
    if (value <= 0) return false;

    player.keys += value;
    return true;
}

function processPurchase(player, item) {
    try {
        ensurePlayerEconomy(player);

        if (!item || typeof item !== 'object') {
            return {
                success: false,
                message: '❌ Item inválido.'
            };
        }

        const price = getNumericPrice(item);
        const currency = item.currency || 'gold';

        if (price <= 0) {
            return {
                success: false,
                message: '❌ Preço inválido.'
            };
        }

        const allowedTypes = ['consumable', 'equipment', 'vip', 'key'];
        if (!allowedTypes.includes(item.type)) {
            return {
                success: false,
                message: '❌ Tipo de item desconhecido.'
            };
        }

        if (!canPay(player, currency, price)) {
            return {
                success: false,
                message: `❌ Não tens ${getCurrencyLabel(currency)} suficiente!`
            };
        }

        pay(player, currency, price);

        let applied = false;

        switch (item.type) {
            case 'consumable':
                applied = addConsumable(player, item);
                break;

            case 'equipment':
                applied = addEquipment(player, item);
                break;

            case 'vip':
                applied = addVip(player, item);
                break;

            case 'key':
                applied = addKey(player, item);
                break;
        }

        if (!applied) {
            return {
                success: false,
                message: '❌ Não foi possível processar a compra.'
            };
        }

        return {
            success: true,
            message: `✅ Compraste ${item.name} com sucesso!`
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Erro ao processar compra: ${error.message}`
        };
    }
}

module.exports = {
    ensurePlayerEconomy,
    getCurrencyLabel,
    processPurchase
};