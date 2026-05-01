const { enemyPools } = require('../world/enemies');
const { getMapById, maps } = require('../world/maps');

function safeNumber(val) {
    return Number.isFinite(Number(val)) ? Number(val) : 0;
}

function getMapNumber(mapId) {
    const mapMap = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4,
        citadela_lunar: 5,
        abismo_noctra: 6
    };

    return mapMap[mapId] || 1;
}

function getMapLevelRange(mapId = 'clareira_sombria') {
    return {
        clareira_sombria: { min: 1, max: 8 },
        cripta_em_ruinas: { min: 8, max: 15 },
        pantano_corrompido: { min: 15, max: 24 },
        deserto_incandescente: { min: 24, max: 32 },
        citadela_lunar: { min: 32, max: 42 },
        abismo_noctra: { min: 42, max: 55 }
    }[mapId] || { min: 1, max: 8 };
}

function getDungeonMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function getDungeonEnemyPool(mapId) {
    const pool = enemyPools[mapId] || enemyPools.clareira_sombria;

    return {
        common: pool.common || [],
        elite: pool.elite || [],
        boss: pool.boss || []
    };
}

function weightedPick(entries) {
    const validEntries = entries.filter(e => (e.weight || 0) > 0);
    const total = validEntries.reduce((sum, e) => sum + (e.weight || 0), 0);

    if (!validEntries.length || total <= 0) return entries[0]?.value || 'combat';

    let roll = Math.random() * total;

    for (const e of validEntries) {
        roll -= e.weight || 0;
        if (roll <= 0) return e.value;
    }

    return validEntries[validEntries.length - 1]?.value || 'combat';
}

function pickRoomType(entries, previousType = null) {
    const picked = weightedPick(entries);

    if (picked !== previousType || picked === 'combat') {
        return picked;
    }

    const alternative = entries.find(entry => entry.value !== previousType && (entry.weight || 0) > 0);
    return alternative?.value || picked;
}

function getRoomTypeWeights(slotIndex, totalRooms) {
    const penultimateSlot = totalRooms - 2;

    if (slotIndex === 1) {
        return [
            { value: 'treasure', weight: 26 },
            { value: 'heal', weight: 24 },
            { value: 'curse', weight: 18 },
            { value: 'combat', weight: 16 },
            { value: 'shrine', weight: 12 },
            { value: 'elite', weight: 4 }
        ];
    }

    if (slotIndex === penultimateSlot) {
        return [
            { value: 'elite', weight: 42 },
            { value: 'combat', weight: 18 },
            { value: 'curse', weight: 16 },
            { value: 'shrine', weight: 10 },
            { value: 'heal', weight: 8 },
            { value: 'treasure', weight: 6 }
        ];
    }

    return [
        { value: 'combat', weight: 26 },
        { value: 'elite', weight: 18 },
        { value: 'curse', weight: 16 },
        { value: 'treasure', weight: 15 },
        { value: 'heal', weight: 15 },
        { value: 'shrine', weight: 10 }
    ];
}

function hasEventRoom(types) {
    return types.some(type => ['treasure', 'heal', 'curse', 'shrine'].includes(type));
}

function hasDangerRoom(types) {
    return types.some(type => ['elite', 'curse'].includes(type));
}

function buildDungeonRoomTypes(maxRooms = 5) {
    const roomCount = Math.max(3, Math.min(5, Math.floor(safeNumber(maxRooms) || 5)));
    const types = ['combat'];

    for (let i = 1; i < roomCount - 1; i += 1) {
        const previousType = types[types.length - 1];
        types.push(pickRoomType(getRoomTypeWeights(i, roomCount), previousType));
    }

    types.push('boss');

    if (!hasEventRoom(types) && roomCount > 3) {
        types[1] = weightedPick([
            { value: 'treasure', weight: 34 },
            { value: 'heal', weight: 30 },
            { value: 'curse', weight: 22 },
            { value: 'shrine', weight: 14 }
        ]);
    }

    if (!hasDangerRoom(types) && roomCount > 4) {
        types[roomCount - 2] = weightedPick([
            { value: 'elite', weight: 70 },
            { value: 'curse', weight: 30 }
        ]);
    }

    return types;
}

const DEFAULT_ROOM_VARIANTS = {
    combat: [
        { emoji: '⚔️', title: 'Sala de Conflito', desc: 'Câmara tomada por sombras.' },
        { emoji: '🗡️', title: 'Corredor Hostil', desc: 'Passos ecoam antes do ataque.' },
        { emoji: '🩸', title: 'Área de Emboscada', desc: 'Marcas recentes denunciam uma armadilha.' }
    ],
    elite: [
        { emoji: '🔥', title: 'Câmara de Elite', desc: 'Algo forte está à espreita.' },
        { emoji: '👁️', title: 'Vigília do Predador', desc: 'Uma presença superior observa sua entrada.' },
        { emoji: '⛓️', title: 'Arena Selada', desc: 'As sombras fecham todas as saídas.' }
    ],
    treasure: [
        { emoji: '🎁', title: 'Sala do Tesouro', desc: 'Relíquias espalhadas.' },
        { emoji: '🧰', title: 'Depósito Abandonado', desc: 'Caixas antigas escondem valor e risco.' },
        { emoji: '💰', title: 'Nicho de Espólios', desc: 'Restos de expedições anteriores brilham no chão.' }
    ],
    heal: [
        { emoji: '❤️', title: 'Fonte Sombria', desc: 'Energia ancestral pulsa.' },
        { emoji: '💧', title: 'Poço de Recuperação', desc: 'Água fria carrega traços de vida.' },
        { emoji: '🕯️', title: 'Refúgio Breve', desc: 'Uma chama fraca mantém a corrupção afastada.' }
    ],
    curse: [
        { emoji: '💀', title: 'Santuário Corrompido', desc: 'Escolhas trazem poder e dor.' },
        { emoji: '🕳️', title: 'Fenda Maldita', desc: 'A escuridão exige pagamento.' },
        { emoji: '🩶', title: 'Altar Quebrado', desc: 'Aceitar o risco pode acelerar a run.' }
    ],
    shrine: [
        { emoji: '✨', title: 'Santuário Arcano', desc: 'Uma bênção antiga emana deste altar.' },
        { emoji: '🔮', title: 'Círculo de Runas', desc: 'Símbolos esquecidos reagem à sua presença.' },
        { emoji: '🌙', title: 'Marco Lunar', desc: 'Uma luz pálida atravessa a masmorra.' }
    ],
    boss: [
        { emoji: '👑', title: 'Trono do Guardião', desc: 'O guardião final bloqueia a passagem.' },
        { emoji: '🚪', title: 'Portão Final', desc: 'A última sombra protege a saída.' },
        { emoji: '⚰️', title: 'Câmara do Senhor', desc: 'O silêncio termina quando o boss desperta.' }
    ]
};

const MAP_ROOM_VARIANTS = {
    clareira_sombria: {
        combat: [
            { emoji: '🌲', title: 'Trilha Fechada', desc: 'Galhos negros se movem como garras.' },
            { emoji: '🐾', title: 'Covil Raso', desc: 'Pegadas frescas levam direto ao inimigo.' },
            { emoji: '🕸️', title: 'Teia Entre Árvores', desc: 'A floresta tenta prender sua passagem.' }
        ],
        elite: [
            { emoji: '🐺', title: 'Território do Alfa', desc: 'Um caçador maior domina esta parte da clareira.' },
            { emoji: '🌫️', title: 'Névoa Predatória', desc: 'A névoa esconde uma criatura mais perigosa.' }
        ],
        treasure: [
            { emoji: '🪵', title: 'Toco Oco', desc: 'Algo foi escondido dentro da madeira apodrecida.' },
            { emoji: '🍂', title: 'Bolsa Perdida', desc: 'Folhas negras cobrem um pequeno espólio.' }
        ],
        heal: [
            { emoji: '💧', title: 'Riacho Escuro', desc: 'A água corre fria, mas ainda resta vida nela.' },
            { emoji: '🌿', title: 'Clareira Viva', desc: 'Raízes antigas oferecem recuperação breve.' }
        ],
        curse: [
            { emoji: '🦴', title: 'Totem de Ossos', desc: 'A floresta cobra sangue por poder.' },
            { emoji: '🌑', title: 'Marca da Matilha', desc: 'A corrupção tenta cravar um pacto na sua pele.' }
        ],
        shrine: [
            { emoji: '🪨', title: 'Pedra Lunar', desc: 'Runas cobertas por musgo ainda respondem.' },
            { emoji: '🕯️', title: 'Vela Esquecida', desc: 'Uma chama impossível ilumina o caminho.' }
        ],
        boss: [
            { emoji: '🐺', title: 'Ninho do Guardião', desc: 'O protetor corrompido da clareira bloqueia a saída.' }
        ]
    },

    cripta_em_ruinas: {
        combat: [
            { emoji: '🪦', title: 'Galeria dos Mortos', desc: 'Túmulos quebrados se abrem ao seu redor.' },
            { emoji: '🦇', title: 'Arco Desabado', desc: 'As ruínas tremem enquanto algo desperta.' },
            { emoji: '⚱️', title: 'Sala das Urnas', desc: 'Cinzas antigas se erguem em forma de ameaça.' }
        ],
        elite: [
            { emoji: '☠️', title: 'Cripta Selada', desc: 'Um morto poderoso protege este corredor.' },
            { emoji: '🔗', title: 'Câmara dos Acorrentados', desc: 'Correntes vazias anunciam um inimigo superior.' }
        ],
        treasure: [
            { emoji: '⚰️', title: 'Sarcófago Rachado', desc: 'O interior guarda espólio e mau presságio.' },
            { emoji: '💍', title: 'Ossário Nobre', desc: 'Restos de uma linhagem antiga ainda carregam valor.' }
        ],
        heal: [
            { emoji: '🕯️', title: 'Capela Mortuária', desc: 'Velas azuis reduzem a pressão da cripta.' },
            { emoji: '💧', title: 'Fonte Sepulcral', desc: 'A água parada devolve parte da sua força.' }
        ],
        curse: [
            { emoji: '📜', title: 'Epitáfio Maldito', desc: 'Ler as inscrições custa caro.' },
            { emoji: '☠️', title: 'Pacto dos Ossos', desc: 'Os mortos oferecem poder em troca de vitalidade.' }
        ],
        shrine: [
            { emoji: '🕯️', title: 'Altar Funerário', desc: 'Uma prece antiga ainda pode proteger você.' },
            { emoji: '🔮', title: 'Runa Necromante', desc: 'Energia azul pulsa entre as pedras.' }
        ],
        boss: [
            { emoji: '☠️', title: 'Câmara do Necromante', desc: 'O senhor da cripta ergue sua última defesa.' }
        ]
    },

    pantano_corrompido: {
        combat: [
            { emoji: '🧪', title: 'Charco Tóxico', desc: 'Bolhas verdes estouram ao redor dos seus pés.' },
            { emoji: '🐸', title: 'Lama Viva', desc: 'O pântano se move como se respirasse.' },
            { emoji: '🌾', title: 'Juncos Infectados', desc: 'Algo observa por trás das plantas apodrecidas.' }
        ],
        elite: [
            { emoji: '🦠', title: 'Ninho Pestilento', desc: 'Uma criatura mutada domina a lama.' },
            { emoji: '🧟', title: 'Ilha dos Afogados', desc: 'Os mortos do pântano não afundam mais.' }
        ],
        treasure: [
            { emoji: '🧰', title: 'Barco Afundado', desc: 'Carga antiga boia entre veneno e lodo.' },
            { emoji: '🫙', title: 'Frascos Perdidos', desc: 'Componentes raros sobreviveram à corrupção.' }
        ],
        heal: [
            { emoji: '🌿', title: 'Ervas Luminosas', desc: 'Plantas raras combatem parte da toxina.' },
            { emoji: '💧', title: 'Nascente Turva', desc: 'Nem toda água deste pântano foi perdida.' }
        ],
        curse: [
            { emoji: '🧪', title: 'Poço Corrosivo', desc: 'A lama queima, mas promete força.' },
            { emoji: '🐍', title: 'Totem Venenoso', desc: 'A bênção vem com toxina no sangue.' }
        ],
        shrine: [
            { emoji: '🦋', title: 'Brilho no Lodo', desc: 'Uma energia frágil resiste à podridão.' },
            { emoji: '✨', title: 'Raiz Ancestral', desc: 'A raiz pulsa como um coração antigo.' }
        ],
        boss: [
            { emoji: '🧪', title: 'Núcleo do Lodo', desc: 'O guardião final emerge do centro da corrupção.' }
        ]
    },

    deserto_incandescente: {
        combat: [
            { emoji: '🏜️', title: 'Duna Cortante', desc: 'O vento quente revela uma ameaça sob a areia.' },
            { emoji: '🦂', title: 'Areia Movente', desc: 'A superfície se rompe em garras e ferrões.' },
            { emoji: '🔥', title: 'Passagem em Brasa', desc: 'Cada passo aproxima você de algo faminto.' }
        ],
        elite: [
            { emoji: '🔥', title: 'Forja Enterrada', desc: 'Uma criatura incandescente protege as ruínas.' },
            { emoji: '🦂', title: 'Ninho de Escorpiões', desc: 'O calor atrai predadores maiores.' }
        ],
        treasure: [
            { emoji: '🏺', title: 'Ânfora Antiga', desc: 'Tesouros foram selados contra o fogo.' },
            { emoji: '💰', title: 'Caravana Perdida', desc: 'Restos carbonizados escondem espólios valiosos.' }
        ],
        heal: [
            { emoji: '🌵', title: 'Cacto Lunar', desc: 'A seiva fria reduz a queimadura da jornada.' },
            { emoji: '🧊', title: 'Sombra Impossível', desc: 'Um abrigo breve desafia o calor.' }
        ],
        curse: [
            { emoji: '🔥', title: 'Altar das Cinzas', desc: 'O fogo consome vida e devolve poder.' },
            { emoji: '☀️', title: 'Marca Solar', desc: 'A bênção queima antes de fortalecer.' }
        ],
        shrine: [
            { emoji: '🌙', title: 'Obelisco Lunar', desc: 'Pedra fria corta o domínio das chamas.' },
            { emoji: '✨', title: 'Runa de Vidro', desc: 'Areia vitrificada canaliza energia antiga.' }
        ],
        boss: [
            { emoji: '🔥', title: 'Trono das Brasas', desc: 'O soberano incandescente bloqueia a passagem final.' }
        ]
    }
};

function getRoomVariantPool(mapId, type) {
    const mapVariants = MAP_ROOM_VARIANTS[mapId]?.[type] || [];
    const defaultVariants = DEFAULT_ROOM_VARIANTS[type] || [{ emoji: '❓', title: type, desc: '' }];

    return mapVariants.length ? mapVariants : defaultVariants;
}

function pickRoomVariant(mapId, type) {
    const pool = getRoomVariantPool(mapId, type);
    return pool[Math.floor(Math.random() * pool.length)] || pool[0];
}

function getDungeonRoomLevel(mapId, type, playerLevel, roomIndex) {
    const range = getMapLevelRange(mapId);
    const safeRoomIndex = Math.max(0, safeNumber(roomIndex));
    const safePlayerLevel = Math.max(1, safeNumber(playerLevel) || range.min);

    const typeBonus = type === 'boss' ? 6 : (type === 'elite' ? 4 : 3);
    const roomProgressBonus = Math.max(0, safeRoomIndex - 1);

    /*
    Dungeon precisa ser bem mais difícil que o farm do mesmo mapa,
    mas não pode virar "conteúdo do level atual".
    Se um jogador Lv.32 entra na dungeon da Clareira, a dungeon continua sendo da Clareira,
    porém em versão dungeon: inimigos mais fortes, salas progressivas e boss perigoso.
    */
    const overlevelBonus = Math.min(2, Math.floor(Math.max(0, safePlayerLevel - range.max) / 10));
    const rawLevel = range.min + roomProgressBonus + typeBonus + overlevelBonus;
    const cap = range.max + (type === 'boss' ? 6 : (type === 'elite' ? 4 : 3));

    return Math.max(range.min + 2, Math.min(rawLevel, cap));
}

function getDungeonStatScale(type, roomIndex) {
    const safeRoomIndex = Math.max(0, safeNumber(roomIndex));
    const roomScalar = 1 + Math.max(0, safeRoomIndex - 1) * 0.07;

    if (type === 'boss') return roomScalar * 1.95;
    if (type === 'elite') return roomScalar * 1.70;
    return roomScalar * 1.45;
}

function scaleDungeonEnemyStats(enemyTemplate, mapId, type, playerLevel, roomIndex) {
    const level = getDungeonRoomLevel(mapId, type, playerLevel, roomIndex);
    const range = getMapLevelRange(mapId);
    const levelDelta = Math.max(0, level - range.min);
    const scalar = getDungeonStatScale(type, roomIndex);

    const baseHp = safeNumber(enemyTemplate.hp) || (type === 'boss' ? 170 : (type === 'elite' ? 110 : 70));
    const baseAtk = safeNumber(enemyTemplate.atk) || (type === 'boss' ? 14 : (type === 'elite' ? 10 : 7));
    const baseDef = safeNumber(enemyTemplate.def) || (type === 'boss' ? 10 : (type === 'elite' ? 8 : 5));
    const baseCrit = safeNumber(enemyTemplate.crit) || (type === 'boss' ? 12 : (type === 'elite' ? 10 : 6));
    const baseXp = safeNumber(enemyTemplate.xp) || (type === 'boss' ? 110 : (type === 'elite' ? 65 : 35));
    const baseGold = safeNumber(enemyTemplate.gold) || (type === 'boss' ? 110 : (type === 'elite' ? 60 : 25));

    return {
        hp: Math.max(1, Math.round(baseHp * scalar * (1 + levelDelta * 0.045))),
        atk: Math.max(1, Math.round(baseAtk * scalar * (1 + levelDelta * 0.032))),
        def: Math.max(0, Math.round(baseDef * scalar * (1 + levelDelta * 0.026))),
        crit: Math.min(35, Math.round(baseCrit + (type === 'boss' ? 3 : (type === 'elite' ? 2 : 1)))),
        xp: Math.max(1, Math.round(baseXp * scalar * (1 + levelDelta * 0.040))),
        gold: Math.max(1, Math.round(baseGold * scalar * (1 + levelDelta * 0.040))),
        level
    };
}

function getRandomDungeonEnemy(mapId, type, playerLevel, roomIndex) {
    const pool = getDungeonEnemyPool(mapId);

    let enemyTemplate;

    if (type === 'boss') {
        enemyTemplate = pool.boss.length
            ? pool.boss[Math.floor(Math.random() * pool.boss.length)]
            : { name: 'Guardião do Vazio', emoji: '👑' };
    } else if (type === 'elite') {
        enemyTemplate = pool.elite.length
            ? pool.elite[Math.floor(Math.random() * pool.elite.length)]
            : { name: 'Elite Sombria', emoji: '🔥' };
    } else {
        enemyTemplate = pool.common.length
            ? pool.common[Math.floor(Math.random() * pool.common.length)]
            : { name: 'Criatura Sombria', emoji: '👹' };
    }

    const stats = scaleDungeonEnemyStats(enemyTemplate, mapId, type, playerLevel, roomIndex);

    return {
        id: `${type}_${roomIndex}_${Date.now()}`,
        name: enemyTemplate.name,
        emoji: enemyTemplate.emoji || '👹',
        hp: stats.hp,
        maxHp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        crit: stats.crit,
        level: stats.level,
        xp: stats.xp,
        gold: stats.gold,
        isElite: type === 'elite',
        isBoss: type === 'boss',
        ability: enemyTemplate.ability || null,
        frozen: false
    };
}

function createDungeonRoom(player, index, type) {
    const mapId = player.currentMap || 'clareira_sombria';
    const meta = pickRoomVariant(mapId, type);

    const room = {
        index,
        type,
        emoji: meta.emoji,
        title: meta.title,
        description: meta.desc,
        cleared: false,
        clearedAt: null,
        enemy: null,
        reward: null
    };

    if (type === 'combat' || type === 'elite' || type === 'boss') {
        room.enemy = getRandomDungeonEnemy(mapId, type, player.level || 1, index);
    }

    return room;
}

module.exports = {
    safeNumber,
    getMapNumber,
    getMapLevelRange,
    getDungeonMap,
    getDungeonEnemyPool,
    weightedPick,
    pickRoomType,
    getRoomTypeWeights,
    buildDungeonRoomTypes,
    getRoomVariantPool,
    pickRoomVariant,
    getDungeonRoomLevel,
    getDungeonStatScale,
    scaleDungeonEnemyStats,
    getRandomDungeonEnemy,
    createDungeonRoom
};
