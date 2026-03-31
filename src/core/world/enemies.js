const enemyPools = {
    clareira_sombria: {
        common: [
            { name: 'Lobo Sombrio', hp: 80, atk: 12, def: 5, xp: 25, gold: 15 },
            { name: 'Rato Gigante', hp: 60, atk: 10, def: 3, xp: 20, gold: 10 }
        ],
        bosses: [
            { name: '👑 Alfa da Matilha', hp: 350, atk: 35, def: 15, xp: 150, gold: 100, isBoss: true }
        ]
    },
    cripta_em_ruinas: {
        common: [
            { name: 'Esqueleto Guerreiro', hp: 150, atk: 18, def: 10, xp: 50, gold: 30 },
            { name: 'Mago Esqueleto', hp: 120, atk: 22, def: 8, xp: 55, gold: 35 }
        ],
        bosses: [
            { name: '👑 Necromante Ancestral', hp: 800, atk: 70, def: 40, xp: 550, gold: 400, isBoss: true }
        ]
    },
    pantano_corrompido: {
        common: [
            { name: 'Sapo Corrompido', hp: 180, atk: 24, def: 9, xp: 70, gold: 45 },
            { name: 'Serpente Venenosa', hp: 160, atk: 28, def: 8, xp: 75, gold: 50 }
        ],
        bosses: [
            { name: '👑 Guardião do Lodo', hp: 1100, atk: 85, def: 45, xp: 800, gold: 600, isBoss: true }
        ]
    },
    deserto_incandescente: {
        common: [
            { name: 'Escorpião Infernal', hp: 220, atk: 32, def: 12, xp: 95, gold: 60 },
            { name: 'Andarilho de Cinzas', hp: 240, atk: 30, def: 14, xp: 100, gold: 65 }
        ],
        bosses: [
            { name: '👑 Faraó das Brasas', hp: 1600, atk: 110, def: 60, xp: 1200, gold: 900, isBoss: true }
        ]
    }
};
// ... resto do arquivo (getRandomEnemy, scaleEnemy) mantido