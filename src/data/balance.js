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
        dungeonCompletionKeyReward: 0
    },

    souls: {
        /*
        FIX DE RETENÇÃO D7:

        Problema original:
        - fieldBossDropChance: 0.03 (3%)
        - Boss spawna com ~2% na Clareira
        - Resultado: jogador casual precisava de ~1.600 combates para
          ter probabilidade razoável de ver uma soul.
          Com 20 energia/dia = 80 dias de jogo. Ninguém chega lá.

        Ajuste:
        - Boss aumentado para 5% — um jogador que matar 20 bosses
          tem ~64% de chance de ter ao menos 1 soul (antes: 46%).
        - Dungeon boss aumentado para 12% — dungeon deve SEMPRE
          se sentir mais recompensadora que farm comum.
        - Pity ativado em 8 bosses (antes 10) e multiplicador 2.5x
          (antes 2x), garantindo que no pior caso o jogador veja
          uma soul em até ~14 bosses com pity.

        Objetivo: primeira soul dentro de 3-5 dias de jogo ativo.
        */
        fieldEliteThematicDropChance: 0.01,
        fieldMiniBossThematicDropChance: 0.02,
        fieldBossDropChance: 0.05,
        dungeonBossDropChance: 0.12,
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
