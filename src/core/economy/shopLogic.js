function ensurePlayerEconomy(player) {
    if (!player) {
        throw new Error('Player inválido.');
    }

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

    player.cosmetics ??= [];

    player.vip ??= false;
    player.vipExpires ??= null;

    player.maxInventory = player.vip ? 30 : 20;

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
    if (!canPay(player, currency, price)) {
        return false;
    }

    player[currency] -= price;
    return true;
}

function addConsumable(player, item) {
    const key = item.effect;

    if (!key) {
        return {
            success: false,
            message: '❌ Consumível inválido.'
        };
    }

    player.consumables[key] =
        (player.consumables[key] || 0) +
        (item.value || 1);

    return {
        success: true,
        message: `✅ Você comprou ${item.name}!`
    };
}

function addEquipment(player, item) {
    if (player.inventory.length >= player.maxInventory) {
        return {
            success: false,
            message: '❌ Inventário cheio.'
        };
    }

    player.inventory.push({
        id: `${item.id}_${Date.now()}`,
        name: item.name,
        slot: item.slot,
        atk: item.atk || 0,
        def: item.def || 0,
        hp: item.hp || 0,
        crit: item.crit || 0,
        rarity: item.rarity || 'Raro',
        emoji: item.emoji || '⚔️'
    });

    return {
        success: true,
        message: `✅ Você comprou ${item.name}!`
    };
}

function applyVip(player, item) {
    const now = Date.now();

    const currentExpire =
        player.vipExpires
            ? new Date(player.vipExpires).getTime()
            : now;

    const baseTime = Math.max(now, currentExpire);

    const newExpire =
        baseTime +
        (item.days * 24 * 60 * 60 * 1000);

    player.vip = true;
    player.vipExpires = new Date(newExpire).toISOString();

    /*
      CORREÇÃO CRÍTICA
      Sem stack infinito
    */
    player.maxEnergy = 40;
    player.maxInventory = 30;

    player.energy = Math.min(
        player.maxEnergy,
        player.energy || player.maxEnergy
    );

    return {
        success: true,
        message: `✨ VIP ativado por ${item.days} dias!`
    };
}

function addCosmetic(player, item) {
    const alreadyOwned = player.cosmetics.some(
        cosmetic => cosmetic.id === item.id
    );

    if (alreadyOwned) {
        return {
            success: false,
            message: '❌ Você já possui este cosmético.'
        };
    }

    player.cosmetics.push({
        id: item.id,
        name: item.name
    });

    return {
        success: true,
        message: `✨ Cosmético ${item.name} desbloqueado!`
    };
}

function processPurchase(player, item) {
    ensurePlayerEconomy(player);

    if (!item) {
        return {
            success: false,
            message: '❌ Item inválido.'
        };
    }

    if (!canPay(player, item.currency, item.price)) {
        return {
            success: false,
            message: `❌ Você não tem ${currencyLabel(item.currency)} suficiente.`
        };
    }

    /*
      pagamento primeiro
    */
    const paid = pay(player, item.currency, item.price);

    if (!paid) {
        return {
            success: false,
            message: '❌ Saldo insuficiente.'
        };
    }

    switch (item.type) {
        case 'consumable':
            return addConsumable(player, item);

        case 'equipment':
            return addEquipment(player, item);

        case 'vip':
            return applyVip(player, item);

        case 'cosmetic':
            return addCosmetic(player, item);

        default:
            return {
                success: false,
                message: '❌ Tipo de item desconhecido.'
            };
    }
}

module.exports = {
    processPurchase
};