const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_PATH = path.join(__dirname, '..', 'index.js');
const source = fs.readFileSync(INDEX_PATH, 'utf8');

function expectContains(fragment, label) {
    assert.ok(source.includes(fragment), `Callback não registrado (${label}): ${fragment}`);
}

test('callbacks críticos de combate permanecem registrados', () => {
    expectContains("bindAction('combat_attack'", 'combat_attack');
    expectContains("bindAction('combat_defend'", 'combat_defend');
    expectContains("bindAction('combat_soul_menu'", 'combat_soul_menu');
    expectContains('bindAction(/^combat_soul_([01])$/', 'combat_soul_[01]');
    expectContains("bindAction('combat_consumables'", 'combat_consumables');
    expectContains('bindAction(/^combat_use:(potionHp|potionEnergy|tonicStrength|tonicDefense)$/', 'combat_use:*');
    expectContains('bindAction(/^combat_loot:(.+)$/', 'combat_loot:*');
    expectContains('bindAction(/^combat_loot_equip:(.+)$/', 'combat_loot_equip:*');
    expectContains("bindAction('combat_flee'", 'combat_flee');
    expectContains("bindAction('combat_back'", 'combat_back');
});

test('callbacks críticos de dungeon permanecem registrados', () => {
    expectContains("bindAction('dungeon'", 'dungeon');
    expectContains("bindAction('dungeon_start'", 'dungeon_start');
    expectContains("bindAction('dungeon_confirm_start'", 'dungeon_confirm_start');
    expectContains("bindAction('dungeon_attack'", 'dungeon_attack');
    expectContains("bindAction('dungeon_next_room'", 'dungeon_next_room');
    expectContains("bindAction('dungeon_flee'", 'dungeon_flee');
    expectContains("bindAction('dungeon_soul_menu'", 'dungeon_soul_menu');
    expectContains('bindAction(/^dungeon_soul_([01])$/', 'dungeon_soul_[01]');
    expectContains("bindAction('dungeon_consumables'", 'dungeon_consumables');
    expectContains('bindAction(/^dungeon_use:(potionHp|potionEnergy|tonicStrength|tonicDefense)$/', 'dungeon_use:*');
});

test('callbacks críticos de inventário permanecem registrados', () => {
    expectContains("bindAction('inventory'", 'inventory');
    expectContains('bindAction(/^invcat:(.+)$/', 'invcat');
    expectContains('bindAction(/^invpage:(.+):(\\d+)$/', 'invpage');
    expectContains('bindAction(/^eqp:(.+):(\\d+):(\\d+)$/', 'eqp');
    expectContains('bindAction(/^eqid:(.+):(\\d+):(.+)$/', 'eqid');
    expectContains('bindAction(/^eq:(.+):(\\d+):(\\d+)$/', 'eq');
    expectContains('bindAction(/^uneq:(.+):(.+):(\\d+)$/', 'uneq');
    expectContains('bindAction(/^equip_soul_slot:(.+):(\\d+)$/', 'equip_soul_slot');
    expectContains('bindAction(/^equip_soul_(.+)$/', 'equip_soul');
    expectContains('bindAction(/^unequip_soul_(\\d+)$/', 'unequip_soul');
    expectContains('bindAction(/^invskin:equip:(.+)$/', 'invskin:equip');
    expectContains("bindAction(/^invskin:unequip:(title|aura|badge)$/", 'invskin:unequip');
    expectContains("bindAction('use_potion_outside_hp'", 'use_potion_outside_hp');
    expectContains("bindAction('use_tonic_strength'", 'use_tonic_strength');
    expectContains("bindAction('use_tonic_defense'", 'use_tonic_defense');
});

test('callbacks críticos de arena permanecem registrados', () => {
    expectContains("bindAction('arena'", 'arena');
    expectContains("bindAction('arena_fight'", 'arena_fight');
    expectContains("bindAction('arena_attack'", 'arena_attack');
    expectContains("bindAction('arena_defend'", 'arena_defend');
    expectContains("bindAction('arena_flee'", 'arena_flee');
    expectContains("bindAction('arena_consumables'", 'arena_consumables');
    expectContains('bindAction(/^arena_use:(potionHp|potionEnergy|tonicStrength|tonicDefense)$/', 'arena_use:*');
    expectContains("bindAction('arena_chests'", 'arena_chests');
    expectContains('bindAction(/^arena_open_chest:(.+)$/', 'arena_open_chest');
    expectContains("bindAction('arena_ranking'", 'arena_ranking');
    expectContains("bindAction('arena_shop'", 'arena_shop');
    expectContains('bindAction(/^arena_shop_buy:(.+)$/', 'arena_shop_buy');
});

test('callbacks críticos de shop permanecem registrados', () => {
    expectContains("bindAction('shop'", 'shop');
    expectContains("bindAction('shop_buy_menu'", 'shop_buy_menu');
    expectContains("bindAction('shop_sell'", 'shop_sell');
    expectContains('bindAction(/^shop_sell_page_(\\d+)$/', 'shop_sell_page');
    expectContains('bindAction(/^sell_preview_(\\d+)$/', 'sell_preview');
    expectContains('bindAction(/^sell_confirm_key_(.+)$/', 'sell_confirm_key');
    expectContains('bindAction(/^sell_confirm_(\\d+)$/', 'sell_confirm');
    expectContains("bindAction('shop_village'", 'shop_village');
    expectContains("bindAction('shop_castle'", 'shop_castle');
    expectContains("bindAction('shop_arena'", 'shop_arena');
    expectContains('bindAction(/^shop_buy_confirm:(.+):(\\d+)$/', 'shop_buy_confirm');
    expectContains('bindAction(/^shop_buyqty:(.+):(\\d+)$/', 'shop_buyqty');
    expectContains('bindAction(/^shop_backtab:(.+)$/', 'shop_backtab');
    expectContains('bindAction(/^buy_([^:]+)(?::(\\d+))?$/', 'buy_');
});

test('callbacks críticos de expedição permanecem registrados', () => {
    expectContains("bindAction('expedition'", 'expedition');
    expectContains('bindAction(/^exp_start:(.+)$/', 'exp_start');
    expectContains("bindAction('exp_claim'", 'exp_claim');
});
