require('dotenv').config();

const { Telegraf } = require('telegraf');
const express = require('express');

const { mainMenu } = require('./src/menus/mainMenu');

const { handleProfile } = require('./src/handlers/profile');

const {
    handleInventory,
    handleAutoEquip,
    handleEquipManual,
    handleUnequipManual,
    showCategory
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

const {
    handleDungeon,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee
} = require('./src/handlers/dungeon');

const { handleRename } = require('./src/commands/rename');
const { handleClass } = require('./src/commands/class');

const {
    handleEquip,
    handleEquipSoulCommand
} = require('./src/commands/equip');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

function getMainMenuMessage() {
    return `╔══════════════════════════════════╗
║         🌙 *NOCTRA RPG*          ║
╠══════════════════════════════════╣
║   Escolha sua ação:              ║
╚══════════════════════════════════╝`;
}

/*
  REMOVE WEBHOOK
*/
(async () => {
    try {
        const webhookInfo = await bot.telegram.getWebhookInfo();

        if (webhookInfo.url) {
            console.log(`⚠️ Webhook ativo: ${webhookInfo.url}. Removendo...`);
            await bot.telegram.deleteWebhook();
            console.log('✅ Webhook removido.');
        }
    } catch (err) {
        console.error('❌ Erro webhook:', err.message);
    }
})();

/*
  START
*/
bot.start(async (ctx) => {
    await ctx.reply(getMainMenuMessage(), {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
});

/*
  COMANDOS
*/
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
  MENU PRINCIPAL
*/
bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.editMessageText(getMainMenuMessage(), {
        parse_mode: 'Markdown',
        ...mainMenu()
    });
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

bot.action('auto_equip', handleAutoEquip);

/*
  INVENTÁRIO
*/
bot.action('inv_weapon', (ctx) =>
    showCategory(ctx, 'weapon', '⚔️ Armas')
);

bot.action('inv_armor', (ctx) =>
    showCategory(ctx, 'armor', '🛡️ Armaduras')
);

bot.action('inv_jewelry', (ctx) =>
    showCategory(ctx, 'jewelry', '💍 Jóias')
);

bot.action('inv_skin', (ctx) =>
    showCategory(ctx, 'skin', '🎨 Skins')
);

bot.action('inv_consumable', (ctx) =>
    showCategory(ctx, 'consumable', '🧪 Consumíveis')
);

bot.action('inv_soul', (ctx) =>
    showCategory(ctx, 'soul', '💀 Almas')
);

bot.action(/equip_manual_(.+)/, handleEquipManual);

bot.action(
    /^unequip_manual_(weapon|armor|necklace|ring|boots)$/,
    handleUnequipManual
);

/*
  COMBATE NORMAL
*/
bot.action('combat_attack', handleAttack);
bot.action('combat_defend', handleDefend);
bot.action('combat_soul_menu', handleSoulMenu);
bot.action(/combat_soul_([01])/, handleSoul);
bot.action('combat_consumables', handleConsumables);
bot.action('combat_flee', handleFlee);
bot.action('combat_back', handleCombatBack);

/*
  MASMORRA
*/
bot.action('dungeon', handleDungeon);
bot.action('dungeon_attack', handleDungeonAttack);
bot.action('dungeon_next_room', handleDungeonNextRoom);
bot.action('dungeon_flee', handleDungeonFlee);

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

bot.action('rest_energy', handleRestEnergy);

bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
});

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
        `🔄 *Trocar Classe*\n\nUse: /class guerreiro | arqueiro | mago\n\n*Custo:* 💎 25 Nox.`,
        { parse_mode: 'Markdown' }
    );
});

/*
  HEALTH / KEEP ALIVE
*/
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('🌙 NOCTRA ONLINE');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        service: 'NOCTRA RPG',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Health server ativo na porta ${PORT}`);
});

/*
  BOT LAUNCH
*/
bot.launch();

console.log('✅ NOCTRA ONLINE');