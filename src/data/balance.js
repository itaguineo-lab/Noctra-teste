const BALANCE = {
    energy: {
        baseMax: 20,
        vipMax: 40,
        baseRegenMinutes: 10,
        vipRegenMinutes: 8,
        huntCost: 1,
        dungeonEntryKeyCost: 1
    },

    inventory: {
        baseMax: 20,
        vipMax: 30
    },

    vip: {
        xpMultiplier: 1.10,
        goldMultiplier: 1.10
    },

    consumables: {
        potionHp: {
            minHealFlat: 0,
            combatHealPercent: 1.00,
            outsideCombatHealPercent: 1.00,
            dungeonHealPercent: 1.00,
            dungeonMinHealFlat: 0,
            fullHeal: true,
            label: 'Poção de Vida'
        },
        potionEnergy: {
            restoreAmount: 1,
            label: 'Poção de Energia'
        },
        tonicStrength: {
            atkBonus: 10,
            durationMinutes: 30,
            dungeonAtkBonus: 8,
            label: 'Tônico de Força'
        },
        tonicDefense: {
            defBonus: 10,
            durationMinutes: 30,
            dungeonDefBonus: 8,
            label: 'Tônico de Defesa'
        }
    },

    dungeon: {
        fleeConsumesEnergy: false,

        /*
        Chave agora cai de miniboss e boss de campo.
        A dungeon precisa existir como rotina desejável,
        não como sistema decorativo impossível de acessar.
        */
        fieldMiniBossKeyDropChance: 0.20,
        fieldBossKeyDropChance: 0.45
    },

    souls: {
        /*
        Elite temática pode dropar alma, mas raro.
        Miniboss temático também.
        Boss continua sendo fonte principal.
        */
        fieldEliteThematicDropChance: 0.01,
        fieldMiniBossThematicDropChance: 0.02,
        fieldBossDropChance: 0.03,
        dungeonBossDropChance: 0.08,
        worldBossDropChance: 0.15,
        eventBossDropChance: 0.20,

        pityBoostAt: 10,
        pityMultiplier: 2
    },

    rarities: {
        Comum: {
            emoji: '⚪',
            mult: 1.0,
            weight: 50
        },
        Incomum: {
            emoji: '🟢',
            mult: 1.3,
            weight: 25
        },
        Raro: {
            emoji: '🔵',
            mult: 1.7,
            weight: 15
        },
        Épico: {
            emoji: '🟣',
            mult: 2.3,
            weight: 7
        },
        Lendário: {
            emoji: '🟠',
            mult: 3.2,
            weight: 2.5
        },
        Mítico: {
            emoji: '🔴',
            mult: 5,
            weight: 0.5
        }
    }
};

function getRarityEmoji(rarity) {
    return BALANCE.rarities[rarity]?.emoji || '⚪';
}

function getRarityMult(rarity) {
    return BALANCE.rarities[rarity]?.mult || 1;
}

module.exports = {
    BALANCE,
    getRarityEmoji,
    getRarityMult
};