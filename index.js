require('dotenv').config();

const { Telegraf } = require('telegraf');
const http = require('http');

const { mainMenu } = require('./src/menus/mainMenu');
const { handleProfile } = require('./src/handlers/profile');
const {
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvBoots,
    handleInvConsumables,
    handleInvSouls,
    handleEquipItem,
    handleUnequipItem,
    handleEquipSoul,
    handleUnequipSoul,
    handleUsePotionOutside,
    handleAutoEquip
} = require('./src/handlers/inventory');

const {
    handleHunt,
    handleAttack,
    handleDefend,
    handleSoulMenu,
    handleSoul,
    handleConsumables,
    handleFlee,
    handleCombatBack,
    useConsumable
} = require('./src/handlers/combat');

const {
    handleTravel,
    handleTravelTo,
    handleTravelLocked
} = require('./src/handlers/travel');

const {
    handleEnergy,
    handleRestEnergy
} = require('./src/handlers/energy');

const { handleVip } = require('./src/handlers/vip');
const { handleDaily } = require('./src/handlers/daily');
const { handleOnline } = require('./src/handlers/online');

const {
    handleShop,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy
} = require('./src/handlers/shop');

const { handleDungeon } = require('./src/handlers/dungeon');

const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');
const {
    handleEquip,
    handleEquipSoulCommand
} = require('./src/commands/equip');

const bot = new Telegraf(process.env.BOT_TOKEN);

function getMainMenuMessage() {
    return `╔══════════════════════════════════╗
║         🌙 *NOCTRA RPG*          ║
╠══════════════════════════════════╣
║   Escolha sua ação:              ║
╚══════════════════════════════════╝`;
}

(async () => {
    try {
        const webhookInfo =
            await bot.telegram.getWebhookInfo();

        if (webhookInfo.url) {
            console.log(
                `⚠️ Webhook ativo: ${webhookInfo.url}. Removendo...`
            );

            await bot.telegram.deleteWebhook();

            console.log(
                '✅ Webhook removido. Usando polling.'
            );
        }
    } catch (err) {
        console.error(
            '❌ Erro ao verificar webhook:',
            err.message
        );
    }
})();

/*
  COMANDOS
*/
bot.start(async (ctx) => {
    await ctx.reply(getMainMenuMessage(), {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
});

bot.command('energy', handleEnergy);
bot.command('rename', handleRename);
bot.command('class', handleClass);
bot.command('profile', handleProfile);
bot.command('inventory', handleInventory);
bot.command('travel', handleTravel);
bot.command('shop', handleShop);
bot.command('daily', handleDaily);
bot.command('vip', handleVip);
bot.command('online', handleOnline);
bot.command('equip', handleEquip);
bot.command('equipsoul', handleEquipSoulCommand);

/*
  MENU
*/
bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
        getMainMenuMessage(),
        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

/*
  PRINCIPAL
*/
bot.action('hunt', handleHunt);
bot.action('profile', handleProfile);
bot.action('energy', handleEnergy);
bot.action('inventory', handleInventory);
bot.action('shop', handleShop);
bot.action('travel', handleTravel);
bot.action('vip', handleVip);
bot.action('daily', handleDaily);
bot.action('online', handleOnline);
bot.action('dungeon', handleDungeon);

/*
  COMBATE
*/
bot.action('combat_attack', handleAttack);
bot.action('combat_defend', handleDefend);
bot.action('combat_soul_menu', handleSoulMenu);
bot.action(/combat_soul_([01])/, handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);
bot.action('combat_back', handleCombatBack);

/*
  CONSUMÍVEIS
*/
bot.action('use_potion_hp', (ctx) =>
    useConsumable(ctx, 'potion_hp')
);

bot.action('use_potion_energy', (ctx) =>
    useConsumable(ctx, 'potion_energy')
);

bot.action('use_tonic_strength', (ctx) =>
    useConsumable(ctx, 'tonic_strength')
);

bot.action('use_tonic_defense', (ctx) =>
    useConsumable(ctx, 'tonic_defense')
);

bot.action('use_potion_outside_hp', (ctx) =>
    handleUsePotionOutside(ctx, 'hp')
);

bot.action('rest_energy', handleRestEnergy);

bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
});

/*
  INVENTÁRIO
*/
bot.action('inv_weapons', handleInvWeapons);
bot.action('inv_armors', handleInvArmors);
bot.action('inv_jewelry', handleInvJewelry);
bot.action('inv_boots', handleInvBoots);
bot.action('inv_consumables', handleInvConsumables);
bot.action('inv_souls', handleInvSouls);
bot.action('auto_equip', handleAutoEquip);

bot.action(
    /^equip_(weapon|armor|necklace|ring|boots)_(.+)$/,
    handleEquipItem
);

bot.action(
    /^unequip_(weapon|armor|necklace|ring|boots)$/,
    handleUnequipItem
);

bot.action(/^equip_soul_(.+)$/, handleEquipSoul);
bot.action(/^unequip_soul_(\d+)$/, handleUnequipSoul);

/*
  LOJA
*/
bot.action('shop_village', handleShopVillage);
bot.action('shop_castle', handleShopCastle);
bot.action('shop_arena', handleShopArena);
bot.action(/buy_(.+)/, handleBuy);

/*
  VIAGEM
*/
bot.action(/travel_to_(.+)/, handleTravelTo);
bot.action('travel_locked', handleTravelLocked);

/*
  AJUDA
*/
bot.action('rename_help', async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.reply(
        `📝 *Renomear*\n\nUse: /rename <novo_nome>\n\n*Custo:* 1ª grátis, depois 💎 5 Nox.`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('class_help', async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.reply(
        `🔄 *Trocar Classe*\n\nUse: /class guerreiro | arqueiro | mago\n\n*Custo:* 1ª grátis, depois 💎 25 Nox.`,
        { parse_mode: 'Markdown' }
    );
});

/*
  KEEP ALIVE
*/
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('Noctra online');
}).listen(PORT);

bot.launch();

console.log('✅ NOCTRA ONLINE');