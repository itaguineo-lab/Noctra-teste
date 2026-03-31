const shopItems = [
    // Loja da Vila (ouro)
    { id: 'hp_potion', name: 'Poção de Vida', shop: 'village', type: 'consumable', effect: 'hp', value: 50, currency: 'gold', price: 50, description: 'Restaura 50 HP' },
    { id: 'energy_potion', name: 'Poção de Energia', shop: 'village', type: 'consumable', effect: 'energy', value: 10, currency: 'gold', price: 80, description: 'Recupera 10 de energia' },
    { id: 'strength_tonic', name: 'Tônico de Força', shop: 'village', type: 'consumable', effect: 'buff', buff: 'atk', value: 10, duration: 3, currency: 'gold', price: 120, description: '+10 ATK por 3 combates' },
    { id: 'defense_tonic', name: 'Tônico de Defesa', shop: 'village', type: 'consumable', effect: 'buff', buff: 'def', value: 10, duration: 3, currency: 'gold', price: 120, description: '+10 DEF por 3 combates' },
    
    // Castelo (Nox – apenas compra com dinheiro real)
    { id: 'vip_7d', name: 'VIP 7 Dias', shop: 'castle', type: 'vip', days: 7, currency: 'nox', price: 18, description: 'Energia máxima 40, regen 3 min, +10 slots, +50% recompensas' },
    { id: 'vip_30d', name: 'VIP 30 Dias', shop: 'castle', type: 'vip', days: 30, currency: 'nox', price: 60, description: 'Energia máxima 40, regen 3 min, +10 slots, +50% recompensas' },
    { id: 'cosmetic_aura', name: 'Aura Sombria', shop: 'castle', type: 'cosmetic', currency: 'nox', price: 10, description: 'Efeito visual exclusivo' },
    
    // Matadores (Glórias)
    { id: 'arena_blade', name: 'Lâmina da Arena', shop: 'arena', type: 'equipment', slot: 'weapon', atk: 15, def: 0, hp: 0, crit: 5, currency: 'glory', price: 100, description: 'Arma lendária da arena' },
    { id: 'arena_armor', name: 'Armadura do Campeão', shop: 'arena', type: 'equipment', slot: 'armor', atk: 0, def: 15, hp: 30, crit: 0, currency: 'glory', price: 120, description: 'Armadura de gladiador' },
];

module.exports = { shopItems };