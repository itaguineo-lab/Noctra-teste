const { BALANCE } = require('../../data/balance');
const { maps, getAvailableMaps, getNextLockedMap } = require('../world/maps');
const { enemyPools, getRandomEnemy } = require('../world/enemies');
const { shopItems } = require('../../data/shopItems');
const { arenaShopItems } = require('../../data/arenaShopItems');
const { soulsList, getSoulCooldownTurns, isPassiveSoul } = require('../player/souls');
const { ARENA_CHEST_CONFIG, ARENA_LEAGUES } = require('../arena/arenaService');

const EPSILON = 0.000001;

function round(value, precision = 2) {
    const factor = 10 ** precision;
    return Math.round((Number(value) || 0) * factor) / factor;
}

function sum(values = []) {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function average(values = []) {
    return values.length ? sum(values) / values.length : 0;
}

function inRange(value, min, max) {
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max;
}

function makeCheck(id, status, message, details = {}) {
    return {
        id,
        status,
        ok: status !== 'fail',
        message,
        details
    };
}

function pass(id, message, details = {}) {
    return makeCheck(id, 'pass', message, details);
}

function warn(id, message, details = {}) {
    return makeCheck(id, 'warn', message, details);
}

function fail(id, message, details = {}) {
    return makeCheck(id, 'fail', message, details);
}

function makeSeededRandom(seed = 123456) {
    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;

    return function random() {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function withDeterministicRandom(seed, callback) {
    const originalRandom = Math.random;
    Math.random = makeSeededRandom(seed);

    try {
        return callback();
    } finally {
        Math.random = originalRandom;
    }
}

function getEnemyTier(enemy = {}) {
    if (enemy.isBoss) return 'boss';
    if (enemy.isMiniBoss) return 'miniboss';
    if (enemy.isElite) return 'elite';
    return 'common';
}

function getPoolEnemies(pool = {}) {
    return ['common', 'elite', 'miniboss', 'boss']
        .flatMap(tier => Array.isArray(pool[tier]) ? pool[tier].map(enemy => ({ tier, enemy })) : []);
}

function getMapEnemyStats(mapId) {
    const pool = enemyPools[mapId] || {};
    const entries = getPoolEnemies(pool);

    const byTier = entries.reduce((acc, entry) => {
        acc[entry.tier] ??= [];
        acc[entry.tier].push(entry.enemy);
        return acc;
    }, {});

    return {
        mapId,
        count: entries.length,
        tiers: Object.fromEntries(
            ['common', 'elite', 'miniboss', 'boss'].map(tier => {
                const list = byTier[tier] || [];
                return [tier, {
                    count: list.length,
                    avgHp: round(average(list.map(enemy => enemy.hp)), 1),
                    avgAtk: round(average(list.map(enemy => enemy.atk)), 1),
                    avgDef: round(average(list.map(enemy => enemy.def)), 1),
                    avgXp: round(average(list.map(enemy => enemy.xp)), 1),
                    avgGold: round(average(list.map(enemy => enemy.gold)), 1)
                }];
            })
        )
    };
}

function sampleSpawnTiers(mapId, playerLevel, samples = 1000, seed = 777) {
    return withDeterministicRandom(seed + playerLevel, () => {
        const counts = {
            common: 0,
            elite: 0,
            miniboss: 0,
            boss: 0
        };

        for (let i = 0; i < samples; i += 1) {
            const enemy = getRandomEnemy(mapId, playerLevel, 0);
            counts[getEnemyTier(enemy)] += 1;
        }

        return {
            mapId,
            playerLevel,
            samples,
            counts,
            rates: Object.fromEntries(
                Object.entries(counts).map(([tier, count]) => [tier, round(count / samples, 4)])
            )
        };
    });
}

function getRarityTotalWeight() {
    return sum(Object.values(BALANCE.rarities || {}).map(rarity => rarity.weight));
}

function getVillageConsumables() {
    return shopItems.filter(item => item.shop === 'village' && item.currency === 'gold');
}

function getPremiumItems() {
    return shopItems.filter(item => item.currency === 'nox');
}

function getArenaGloriaItems() {
    return [
        ...shopItems.filter(item => item.shop === 'arena' || item.currency === 'glorias'),
        ...arenaShopItems.map(item => ({ ...item, currency: 'glorias', shop: 'arena' }))
    ];
}

function getAverageMapCommonGold(mapId = 'clareira_sombria') {
    const common = enemyPools[mapId]?.common || [];
    return average(common.map(enemy => enemy.gold));
}

function getAverageMapCommonXp(mapId = 'clareira_sombria') {
    const common = enemyPools[mapId]?.common || [];
    return average(common.map(enemy => enemy.xp));
}

function checkEnergyEconomy() {
    const checks = [];
    const cfg = BALANCE.energy || {};

    checks.push(cfg.baseMax === 20
        ? pass('energy.base_max', 'Energia base permanece em 20.', { baseMax: cfg.baseMax })
        : fail('energy.base_max', 'Energia base deveria ser 20.', { baseMax: cfg.baseMax }));

    checks.push(cfg.vipMax === 40
        ? pass('energy.vip_max', 'Energia VIP permanece em 40.', { vipMax: cfg.vipMax })
        : fail('energy.vip_max', 'Energia VIP deveria ser 40.', { vipMax: cfg.vipMax }));

    checks.push(cfg.huntCost === 1
        ? pass('energy.hunt_cost', 'Caça continua custando 1 energia.', { huntCost: cfg.huntCost })
        : fail('energy.hunt_cost', 'Caça deve custar exatamente 1 energia.', { huntCost: cfg.huntCost }));

    checks.push(cfg.dungeonEntryKeyCost === 1
        ? pass('energy.dungeon_key_cost', 'Dungeon continua custando 1 chave.', { dungeonEntryKeyCost: cfg.dungeonEntryKeyCost })
        : fail('energy.dungeon_key_cost', 'Dungeon deve custar 1 chave.', { dungeonEntryKeyCost: cfg.dungeonEntryKeyCost }));

    checks.push(cfg.vipRegenMinutes < cfg.baseRegenMinutes
        ? pass('energy.vip_regen', 'VIP regenera energia mais rápido que jogador comum.', {
            baseRegenMinutes: cfg.baseRegenMinutes,
            vipRegenMinutes: cfg.vipRegenMinutes
        })
        : fail('energy.vip_regen', 'VIP precisa ter regeneração melhor que normal sem alterar poder bruto.', {
            baseRegenMinutes: cfg.baseRegenMinutes,
            vipRegenMinutes: cfg.vipRegenMinutes
        }));

    return checks;
}

function checkMapProgression() {
    const checks = [];

    const levelReqs = maps.map(map => map.levelReq);
    const lootTiers = maps.map(map => map.lootTier);
    const recommendedPower = maps.map(map => map.recommendedPower);

    const levelsAscending = levelReqs.every((level, index) => index === 0 || level > levelReqs[index - 1]);
    const tiersAscending = lootTiers.every((tier, index) => index === 0 || tier > lootTiers[index - 1]);
    const powerAscending = recommendedPower.every((power, index) => index === 0 || power > recommendedPower[index - 1]);

    checks.push(maps[0]?.levelReq === 1
        ? pass('maps.starting_level', 'Primeiro mapa começa no nível 1.', { firstMap: maps[0] })
        : fail('maps.starting_level', 'Primeiro mapa precisa começar no nível 1.', { firstMap: maps[0] }));

    checks.push(levelsAscending
        ? pass('maps.level_gates', 'Level gates dos mapas sobem em ordem.', { levelReqs })
        : fail('maps.level_gates', 'Level gates dos mapas precisam subir em ordem.', { levelReqs }));

    checks.push(tiersAscending
        ? pass('maps.loot_tiers', 'Loot tiers dos mapas sobem em ordem.', { lootTiers })
        : fail('maps.loot_tiers', 'Loot tiers precisam subir em ordem.', { lootTiers }));

    checks.push(powerAscending
        ? pass('maps.recommended_power', 'Poder recomendado sobe em ordem.', { recommendedPower })
        : warn('maps.recommended_power', 'Poder recomendado não está estritamente crescente.', { recommendedPower }));

    const level7Maps = getAvailableMaps(7).map(map => map.id);
    const level8Maps = getAvailableMaps(8).map(map => map.id);
    const nextAt7 = getNextLockedMap(7);

    checks.push(level7Maps.includes('clareira_sombria') && !level7Maps.includes('cripta_em_ruinas') && level8Maps.includes('cripta_em_ruinas')
        ? pass('maps.cripta_gate', 'Cripta abre exatamente no nível 8.', { level7Maps, level8Maps, nextAt7: nextAt7?.id })
        : fail('maps.cripta_gate', 'Cripta deveria abrir no nível 8.', { level7Maps, level8Maps, nextAt7: nextAt7?.id }));

    return checks;
}

function checkEnemyPools() {
    const checks = [];

    for (const map of maps) {
        const pool = enemyPools[map.id];
        const entries = getPoolEnemies(pool);

        if (!pool) {
            checks.push(fail(`enemies.${map.id}.pool`, `Mapa ${map.name} não possui pool de inimigos.`, { mapId: map.id }));
            continue;
        }

        checks.push(Array.isArray(pool.common) && pool.common.length > 0
            ? pass(`enemies.${map.id}.common`, `${map.name} tem inimigos comuns.`, { count: pool.common.length })
            : fail(`enemies.${map.id}.common`, `${map.name} precisa de inimigos comuns.`, { mapId: map.id }));

        const invalid = entries
            .map(({ tier, enemy }) => ({ tier, enemy }))
            .filter(({ enemy }) => {
                return !enemy.id || !enemy.name || enemy.hp <= 0 || enemy.atk <= 0 || enemy.def < 0 || enemy.xp <= 0 || enemy.gold <= 0;
            });

        checks.push(invalid.length === 0
            ? pass(`enemies.${map.id}.stats`, `${map.name} não tem inimigos com stats/recompensas inválidos.`, { total: entries.length })
            : fail(`enemies.${map.id}.stats`, `${map.name} tem inimigos inválidos.`, { invalid }));
    }

    return checks;
}

function checkEarlyGameSpawnProtection() {
    const checks = [];

    for (const level of [1, 2, 3, 4]) {
        const sample = sampleSpawnTiers('clareira_sombria', level, 500, 1000);
        const dangerous = sample.counts.elite + sample.counts.miniboss + sample.counts.boss;

        checks.push(dangerous === 0
            ? pass(`spawn.level_${level}.safe`, `Nível ${level} só encontra inimigos comuns na Clareira.`, sample)
            : fail(`spawn.level_${level}.safe`, `Nível ${level} não deveria encontrar elite/miniboss/boss.`, sample));
    }

    for (const level of [5, 6, 7]) {
        const sample = sampleSpawnTiers('clareira_sombria', level, 800, 2000);

        checks.push(sample.counts.boss === 0
            ? pass(`spawn.level_${level}.no_boss`, `Nível ${level} ainda não encontra boss na Clareira.`, sample)
            : fail(`spawn.level_${level}.no_boss`, `Nível ${level} não deveria encontrar boss na Clareira.`, sample));

        checks.push(sample.rates.common >= 0.82
            ? pass(`spawn.level_${level}.mostly_common`, `Nível ${level} ainda tem maioria de encontros comuns.`, sample)
            : warn(`spawn.level_${level}.mostly_common`, `Nível ${level} pode estar agressivo demais.`, sample));
    }

    const level8 = sampleSpawnTiers('cripta_em_ruinas', 8, 800, 3000);
    checks.push(level8.counts.common > 0 && level8.counts.elite > 0
        ? pass('spawn.level_8.cripta_variety', 'Cripta no nível 8 já oferece variedade de encontros.', level8)
        : warn('spawn.level_8.cripta_variety', 'Cripta no nível 8 pode estar sem variedade suficiente.', level8));

    return checks;
}

function checkDungeonKeyEconomy() {
    const cfg = BALANCE.dungeon || {};
    const checks = [];

    checks.push(cfg.fleeConsumesEnergy === false
        ? pass('dungeon.no_energy_cost', 'Dungeon não consome energia ao fugir.', { fleeConsumesEnergy: cfg.fleeConsumesEnergy })
        : fail('dungeon.no_energy_cost', 'Dungeon não deve consumir energia.', { fleeConsumesEnergy: cfg.fleeConsumesEnergy }));

    checks.push(inRange(cfg.fieldMiniBossKeyDropChance, 0.02, 0.12)
        ? pass('dungeon.miniboss_key_chance', 'Chance de chave em miniboss está em faixa rara saudável.', { chance: cfg.fieldMiniBossKeyDropChance })
        : warn('dungeon.miniboss_key_chance', 'Chance de chave em miniboss pode estar fora da faixa saudável.', { chance: cfg.fieldMiniBossKeyDropChance }));

    checks.push(inRange(cfg.fieldBossKeyDropChance, 0.10, 0.30)
        ? pass('dungeon.boss_key_chance', 'Chance de chave em boss mantém dungeon rara sem ficar invisível.', { chance: cfg.fieldBossKeyDropChance })
        : warn('dungeon.boss_key_chance', 'Chance de chave em boss pode estar agressiva ou invisível demais.', { chance: cfg.fieldBossKeyDropChance }));

    checks.push(cfg.dungeonCompletionKeyReward === 0
        ? pass('dungeon.no_self_feed', 'Dungeon não se autoalimenta com chave garantida.', { dungeonCompletionKeyReward: cfg.dungeonCompletionKeyReward })
        : fail('dungeon.no_self_feed', 'Dungeon não deve devolver chave garantida ao concluir.', { dungeonCompletionKeyReward: cfg.dungeonCompletionKeyReward }));

    return checks;
}

function checkSoulEconomy() {
    const cfg = BALANCE.souls || {};
    const checks = [];

    checks.push(inRange(cfg.fieldBossDropChance, 0.03, 0.08)
        ? pass('souls.field_boss_drop', 'Chance de alma em boss de campo está em faixa rara útil.', { chance: cfg.fieldBossDropChance })
        : warn('souls.field_boss_drop', 'Chance de alma em boss de campo pode comprometer D7.', { chance: cfg.fieldBossDropChance }));

    checks.push(cfg.dungeonBossDropChance > cfg.fieldBossDropChance
        ? pass('souls.dungeon_better_than_field', 'Dungeon tem chance de alma maior que boss de campo.', {
            fieldBossDropChance: cfg.fieldBossDropChance,
            dungeonBossDropChance: cfg.dungeonBossDropChance
        })
        : fail('souls.dungeon_better_than_field', 'Dungeon precisa parecer mais recompensadora que farm comum.', {
            fieldBossDropChance: cfg.fieldBossDropChance,
            dungeonBossDropChance: cfg.dungeonBossDropChance
        }));

    checks.push(inRange(cfg.pityBoostAt, 5, 12)
        ? pass('souls.pity_timing', 'Pity ativa em faixa aceitável para primeira alma.', { pityBoostAt: cfg.pityBoostAt })
        : warn('souls.pity_timing', 'Pity pode estar cedo demais ou tarde demais.', { pityBoostAt: cfg.pityBoostAt }));

    const boostedChance = cfg.fieldBossDropChance * cfg.pityMultiplier;
    checks.push(inRange(boostedChance, 0.08, 0.25)
        ? pass('souls.pity_boosted_chance', 'Chance com pity aumenta sem banalizar alma.', { boostedChance: round(boostedChance, 4) })
        : warn('souls.pity_boosted_chance', 'Chance com pity pode estar fraca ou forte demais.', { boostedChance: round(boostedChance, 4) }));

    const invalidSouls = soulsList.filter(soul => {
        if (!soul.id || !soul.name || !soul.rarity || !soul.effect?.type) return true;
        if (!isPassiveSoul(soul) && getSoulCooldownTurns(soul) <= 0) return true;
        return false;
    });

    checks.push(invalidSouls.length === 0
        ? pass('souls.definitions', 'Todas as almas têm definição mínima e cooldown quando ativas.', { total: soulsList.length })
        : fail('souls.definitions', 'Existem almas com definição/cooldown inválido.', { invalidSouls }));

    return checks;
}

function checkNoxAndShopRules() {
    const checks = [];
    const premium = getPremiumItems();
    const forbiddenPremium = premium.filter(item => {
        const id = `${item.id || ''} ${item.name || ''} ${item.type || ''} ${item.effect || ''}`.toLowerCase();
        return id.includes('soul') || id.includes('alma') || id.includes('key') || id.includes('chave') || item.type === 'equipment';
    });

    checks.push(forbiddenPremium.length === 0
        ? pass('shop.nox_no_power_shortcut', 'Nox não vende alma, chave ou equipamento raro diretamente.', { premiumCount: premium.length })
        : fail('shop.nox_no_power_shortcut', 'Nox não pode vender alma/chave/equipamento como atalho de poder.', { forbiddenPremium }));

    const villageGold = getVillageConsumables();
    const avgGold = getAverageMapCommonGold('clareira_sombria');
    const hpPotion = villageGold.find(item => item.effect === 'potionHp');
    const hpPotionWins = hpPotion ? hpPotion.price / Math.max(1, avgGold) : Infinity;

    checks.push(hpPotion && inRange(hpPotionWins, 4, 14)
        ? pass('shop.hp_potion_price', 'Poção de HP custa algumas vitórias comuns, sem banalizar cura.', {
            price: hpPotion.price,
            avgCommonGold: round(avgGold, 2),
            estimatedCommonWins: round(hpPotionWins, 2)
        })
        : warn('shop.hp_potion_price', 'Preço da poção de HP pode estar barato ou caro demais para early game.', {
            price: hpPotion?.price,
            avgCommonGold: round(avgGold, 2),
            estimatedCommonWins: round(hpPotionWins, 2)
        }));

    return checks;
}

function checkArenaEconomy() {
    const checks = [];
    const chestConfigs = Object.values(ARENA_CHEST_CONFIG || {});

    const invalidChests = chestConfigs.filter(chest => {
        return !chest.id || !Array.isArray(chest.glorias) || !Array.isArray(chest.gold) || chest.glorias[0] <= 0 || chest.gold[0] <= 0;
    });

    checks.push(invalidChests.length === 0
        ? pass('arena.chest_rewards', 'Baús da arena têm recompensas válidas.', { chestCount: chestConfigs.length })
        : fail('arena.chest_rewards', 'Baús da arena têm configuração inválida.', { invalidChests }));

    const maxKeyChance = Math.max(...chestConfigs.map(chest => Number(chest.keyChance || 0)));
    checks.push(maxKeyChance <= 0.25
        ? pass('arena.chest_key_chance', 'Baús da arena não banalizam chaves de dungeon.', { maxKeyChance })
        : warn('arena.chest_key_chance', 'Baús da arena podem estar gerando chave demais.', { maxKeyChance }));

    const leaguePoints = (ARENA_LEAGUES || []).map(league => league.minPoints);
    const leagueAscending = leaguePoints.every((points, index) => index === 0 || points > leaguePoints[index - 1]);
    checks.push(leagueAscending
        ? pass('arena.league_curve', 'Ligas da arena sobem em pontos crescentes.', { leaguePoints })
        : fail('arena.league_curve', 'Ligas da arena precisam ter pontos crescentes.', { leaguePoints }));

    const gloriaItems = getArenaGloriaItems();
    const invalidItems = gloriaItems.filter(item => Number(item.price) <= 0);
    checks.push(invalidItems.length === 0
        ? pass('arena.shop_prices', 'Itens de Glórias têm preço positivo.', { itemCount: gloriaItems.length })
        : fail('arena.shop_prices', 'Itens da arena/Glórias têm preço inválido.', { invalidItems }));

    const minChestGlorias = Math.min(...chestConfigs.map(chest => chest.glorias[0]));
    const cheapestArenaItem = Math.min(...gloriaItems.map(item => item.price));
    checks.push(cheapestArenaItem >= minChestGlorias
        ? pass('arena.shop_vs_chest', 'Item mais barato da arena não fica abaixo da menor recompensa de baú.', {
            minChestGlorias,
            cheapestArenaItem
        })
        : warn('arena.shop_vs_chest', 'Item de arena pode estar barato demais frente aos baús.', {
            minChestGlorias,
            cheapestArenaItem
        }));

    return checks;
}

function buildBalanceSnapshots() {
    return {
        earlyGame: {
            avgCommonGoldClareira: round(getAverageMapCommonGold('clareira_sombria'), 2),
            avgCommonXpClareira: round(getAverageMapCommonXp('clareira_sombria'), 2),
            level1Spawn: sampleSpawnTiers('clareira_sombria', 1, 300, 111),
            level5Spawn: sampleSpawnTiers('clareira_sombria', 5, 300, 222),
            level8CriptaSpawn: sampleSpawnTiers('cripta_em_ruinas', 8, 300, 333)
        },
        maps: maps.map(map => ({
            id: map.id,
            name: map.name,
            levelReq: map.levelReq,
            lootTier: map.lootTier,
            recommendedPower: map.recommendedPower,
            enemies: getMapEnemyStats(map.id)
        })),
        economy: {
            energy: BALANCE.energy,
            dungeon: BALANCE.dungeon,
            souls: BALANCE.souls,
            rarityTotalWeight: round(getRarityTotalWeight(), 2),
            premiumItemCount: getPremiumItems().length,
            arenaGloriaItemCount: getArenaGloriaItems().length
        }
    };
}

function runBalanceDiagnostics() {
    const checks = [
        ...checkEnergyEconomy(),
        ...checkMapProgression(),
        ...checkEnemyPools(),
        ...checkEarlyGameSpawnProtection(),
        ...checkDungeonKeyEconomy(),
        ...checkSoulEconomy(),
        ...checkNoxAndShopRules(),
        ...checkArenaEconomy()
    ];

    const failures = checks.filter(check => check.status === 'fail');
    const warnings = checks.filter(check => check.status === 'warn');
    const passes = checks.filter(check => check.status === 'pass');

    return {
        ok: failures.length === 0,
        summary: {
            total: checks.length,
            pass: passes.length,
            warn: warnings.length,
            fail: failures.length
        },
        checks,
        failures,
        warnings,
        snapshots: buildBalanceSnapshots()
    };
}

function formatDiagnosticsReport(report = runBalanceDiagnostics()) {
    const lines = [];
    lines.push('📊 BALANCE DIAGNOSTICS — NOCTRA');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Status: ${report.ok ? 'OK' : 'FALHA'}`);
    lines.push(`Checks: ${report.summary.pass} pass | ${report.summary.warn} warn | ${report.summary.fail} fail`);

    if (report.failures.length) {
        lines.push('\nFALHAS');
        report.failures.forEach(check => lines.push(`- ${check.id}: ${check.message}`));
    }

    if (report.warnings.length) {
        lines.push('\nAVISOS');
        report.warnings.forEach(check => lines.push(`- ${check.id}: ${check.message}`));
    }

    if (!report.failures.length && !report.warnings.length) {
        lines.push('\nNenhuma falha ou aviso crítico encontrado.');
    }

    return lines.join('\n');
}

module.exports = {
    EPSILON,
    round,
    average,
    inRange,
    makeSeededRandom,
    withDeterministicRandom,
    getEnemyTier,
    getMapEnemyStats,
    sampleSpawnTiers,
    getRarityTotalWeight,
    getVillageConsumables,
    getPremiumItems,
    getArenaGloriaItems,
    getAverageMapCommonGold,
    getAverageMapCommonXp,
    checkEnergyEconomy,
    checkMapProgression,
    checkEnemyPools,
    checkEarlyGameSpawnProtection,
    checkDungeonKeyEconomy,
    checkSoulEconomy,
    checkNoxAndShopRules,
    checkArenaEconomy,
    buildBalanceSnapshots,
    runBalanceDiagnostics,
    formatDiagnosticsReport
};
