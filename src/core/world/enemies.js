// MAPA 4: DESERTO INCANDESCENTE (Nível 18-30) - DEF aumentada em 20%
deserto_incandescente: {
    common: [
        {
            id: 'sand_scorpion',
            name: 'Escorpião da Areia',
            emoji: '🦂',
            hp: 220, atk: 32, def: 22, crit: 8,  // def 18 -> 22 (+20%)
            xp: 100, gold: 70,
            ability: { type: 'POISON', chance: 0.4 }
        },
        {
            id: 'dune_raider',
            name: 'Saqueador das Dunas',
            emoji: '🏜️',
            hp: 250, atk: 30, def: 24, crit: 10, // def 20 -> 24
            xp: 110, gold: 80,
            ability: null
        },
        {
            id: 'fire_elemental',
            name: 'Elemental de Fogo',
            emoji: '🔥',
            hp: 200, atk: 38, def: 14, crit: 12, // def 12 -> 14
            xp: 120, gold: 75,
            ability: { type: 'BLEED', chance: 0.3 }
        }
    ],
    elite: [
        {
            id: 'giant_scorpion',
            name: 'Escorpião Gigante',
            emoji: '🦂',
            hp: 380, atk: 48, def: 34, crit: 12, // def 28 -> 34
            xp: 210, gold: 150,
            isElite: true,
            ability: { type: 'POISON', chance: 0.6 }
        },
        {
            id: 'sand_wurm',
            name: 'Verme da Areia',
            emoji: '🐛',
            hp: 450, atk: 45, def: 36, crit: 10, // def 30 -> 36
            xp: 230, gold: 160,
            isElite: true,
            ability: { type: 'STUN', chance: 0.4 }
        }
    ],
    miniboss: [
        {
            id: 'pharaoh_guardian',
            name: 'Guardião do Faraó',
            emoji: '⚱️',
            hp: 550, atk: 55, def: 42, crit: 14, // def 35 -> 42
            xp: 300, gold: 220,
            isMiniBoss: true,
            ability: { type: 'SHIELD', chance: 0.5 }
        }
    ],
    boss: [
        {
            id: 'pharaoh_of_embers',
            name: 'Faraó das Brasas',
            emoji: '🔥',
            hp: 700, atk: 65, def: 48, crit: 18, // def 40 -> 48
            xp: 450, gold: 350,
            isBoss: true,
            ability: { type: 'HEAL', chance: 0.3 }
        }
    ]
},