function ensurePlayerEconomy(player) {
    if (!player) throw new Error('Player inválido.');
    player.gold ??= 0;
    player.nox ??= 0;
    player.glorias ??= 0;
    player.inventory ??= [];
    player.maxInventory ??= player.vip ? 30 : 20;
    player.consumables ??= { potionHp: 0, potionEnergy: 0, tonicStrength: 0, tonicDefense: 0 };
    return player;
}

function currencyLabel(currency) {
    if (currency === 'gold') return 'ouro';
    if (currency === 'nox') return 'Nox';
    if (currency === 'glorias') return 'glórias';
    return currency;
}

function canPay(player, currency, price) {
    const balance = player[currency] || 0;
    return balance >= price;
}

function pay(player, currency, price) {
    if (!canPay(player, currency, price)) return false;
    player[currency] -= price;
    return true;
}

function processPurchase(player, item) {
    ensurePlayerEconomy(player);
    if (!item) return { success: false, message: 'Item inválido.' };
    if (!canPay(player, item.currency, item.price)) {
        return { success: false, message: `❌ Você não tem ${currencyLabel(item.currency)} suficiente.` };
    }
    pay(player, item.currency, item.price);
    switch (item.type) {
        case 'consumable': {
            const key = item.effect;
            if (!key) return { success: false, message: 'Consumível inválido.' };
            player.consumables[key] = (player.consumables[key] || 0) + (item.value || 1);
            break;
        }
        case 'equipment': {
            player.inventory.push({
                id: `${item.id}_${Date.now()}`,
                name: item.name,
                slot: item.slot,
                atk: item.atk || 0,
                def: item.def || 0,
                hp: item.hp || 0,
                crit: item.crit || 0,
                rarity: item.rarity || 'Comum'
            });
            break;
        }
        case 'vip': {
            const now = Date.now();
            const currentExpire = player.vipExpires ? new Date(player.vipExpires).getTime() : now;
            const base = Math.max(now, currentExpire);
            const newExpire = base + (item.days * 24 * 60 * 60 * 1000);
            player.vip = true;
            player.vipExpires = new Date(newExpire).toISOString();
            player.maxEnergy = 40;
            player.bonusInventory = (player.bonusInventory || 0) + 10;
            player.maxInventory = 20 + player.bonusInventory;
            break;
        }
        case 'cosmetic': {
            player.cosmetics = player.cosmetics || [];
            player.cosmetics.push({ id: item.id, name: item.name });
            break;
        }
        default:
            return { success: false, message: 'Tipo de item desconhecido.' };
    }
    return { success: true, message: `✅ Você comprou ${item.name}!` };
}

module.exports = { processPurchase };