const fs = require('fs');
const path = require('path');

const playersFilePath = path.join(
    __dirname,
    '../../data/players.json'
);

const BASE_STATS = {
    guerreiro: {
        atk: 12,
        def: 10,
        hp: 120,
        crit: 5
    },
    mago: {
        atk: 18,
        def: 4,
        hp: 80,
        crit: 8
    },
    arqueiro: {
        atk: 15,
        def: 6,
        hp: 100,
        crit: 10
    }
};

function loadPlayers() {
    try {
        if (!fs.existsSync(playersFilePath)) {
            return {};
        }

        return JSON.parse(
            fs.readFileSync(
                playersFilePath,
                'utf8'
            )
        );
    } catch (error) {
        console.error(
            'Erro ao carregar jogadores:',
            error
        );

        return {};
    }
}

function savePlayers(players) {
    try {
        fs.writeFileSync(
            playersFilePath,
            JSON.stringify(
                players,
                null,
                2
            )
        );
    } catch (error) {
        console.error(
            'Erro ao salvar jogadores:',
            error
        );
    }
}

function createDefaultPlayer(
    id,
    name = 'Viajante'
) {
    const player = {
        id,
        name,

        class: 'guerreiro',
        level: 1,
        xp: 0,

        gold: 0,
        nox: 0,
        glorias: 0,

        currentMap:
            'clareira_sombria',

        hp: 0,
        maxHp: 0,
        atk: 0,
        def: 0,
        crit: 5,

        energy: 20,
        maxEnergy: 20,

        inventory: [],
        souls: [null, null],

        equipment: {
            weapon: null,
            armor: null,
            accessory: null
        },

        keys: 0,
        vip: false,
        vipExpires: null,

        createdAt:
            Date.now(),
        updatedAt:
            Date.now()
    };

    recalculateStats(player);

    player.hp =
        player.maxHp;

    return player;
}

function getPlayer(id, name) {
    const players =
        loadPlayers();

    if (!players[id]) {
        players[id] =
            createDefaultPlayer(
                id,
                name
            );

        savePlayers(players);
    }

    return players[id];
}

function savePlayer(
    id,
    player
) {
    const players =
        loadPlayers();

    player.updatedAt =
        Date.now();

    players[id] = player;

    savePlayers(players);
}

function recalculateStats(
    player
) {
    const base =
        BASE_STATS[
            player.class
        ] ||
        BASE_STATS.guerreiro;

    let atk =
        base.atk +
        (
            (player.level - 1) *
            3
        );

    let def =
        base.def +
        (
            (player.level - 1) *
            2
        );

    let maxHp =
        base.hp +
        (
            (player.level - 1) *
            20
        );

    let crit =
        base.crit;

    if (
        player.equipment
    ) {
        Object.values(
            player.equipment
        ).forEach(item => {
            if (!item) return;

            atk +=
                item.atk || 0;

            def +=
                item.def || 0;

            maxHp +=
                item.hp || 0;

            crit +=
                item.crit || 0;
        });
    }

    player.atk = atk;
    player.def = def;
    player.maxHp = maxHp;
    player.crit = crit;

    if (
        player.hp >
        player.maxHp
    ) {
        player.hp =
            player.maxHp;
    }

    return player;
}

module.exports = {
    loadPlayers,
    savePlayer,
    getPlayer,
    recalculateStats,
    createDefaultPlayer
};