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
        vipMax: 30,
        premiumExpansionStep: 5,
        premiumMaxBonus: 30
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
            /*
            FIX: era 1. Com restoreAmount: 1, a poção restaurava exatamente
            o custo de 1 caça. Valor percebido = zero. Ninguém compra nem usa.
            Agora restaura 3, tornando a poção relevante como item de
            emergência e como alvo de compra na loja.
            */
            restoreAmount: 3,
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
        Regra oficial de economia:
        - Dungeon consome chave, não energia.
        - Chave deve ser rara o suficiente para a dungeon parecer evento desejável.
        - Dungeon NÃO deve se autoalimentar com chave garantida.

        Ajuste:
        Os valores antigos (20% miniboss / 45% boss) deixavam chave comum demais.
        Com energia diária limitada, esse ajuste mantém dungeon como pico de sessão,
        sem transformar a chave em recurso banal.
        */
        fieldMiniBossKeyDropChance: 0.07,
        fieldBossKeyDropChance: 0.22,
        dungeonTreasureKeyDropChance: 0.06,
        dungeonCurseKeyDropChance: 0.04,
        dungeonCompletionKeyReward: 0,

        /*
        Drop extra de item em sala de tesouro.
        Recompensa final da dungeon já é garantida; sala de tesouro não pode
        transformar cada run em chuva de equipamento. Mantém dopamina sem
        inflar inventário nem banalizar raridade.
        */
        dungeonTreasureItemDropChance: 0.12
    },

    souls: {
        /*
        Diretriz atual:
        - Alma precisa ser rara o bastante para gerar coleção, build e status.
        - Dungeon deve ser melhor que campo, mas não pode entregar alma com
          frequência visual de item comum.
        - A primeira alma deve aparecer cedo o suficiente para provar o sistema,
          porém souls repetidas/lendárias não podem banalizar D7/D30.

        A chance de boss de dungeon volta para 8%, alinhada à regra oficial
        do produto. O pity continua agressivo no campo para proteger onboarding,
        mas dungeon não vira fábrica de almas.
        */
        fieldEliteThematicDropChance: 0.01,
        fieldMiniBossThematicDropChance: 0.02,
        fieldBossDropChance: 0.05,
        dungeonBossDropChance: 0.08,
        worldBossDropChance: 0.15,
        eventBossDropChance: 0.20,

        pityBoostAt: 8,
        pityMultiplier: 2.5
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
