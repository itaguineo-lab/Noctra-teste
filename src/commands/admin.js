const { getPlayer, savePlayer, getPlayerCollection } = require('../core/player/playerService');
const { generateDrop } = require('../data/items');
const { shopItems } = require('../data/shopItems');

/*
=================================
ADMIN AUTH
=================================
*/

function isAdmin(ctx) {
    const adminIds = process.env.ADMIN_IDS
        ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
        : [];

    return adminIds.includes(String(ctx.from.id));
}

function requireAdmin(ctx, next) {
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem usar este comando.');
    }
    return next();
}

/*
=================================
HELPERS
=================================
*/

async function findPlayerByUsername(username) {
    const collection = await getPlayerCollection();

    return await collection.findOne({
        name: {
            $regex: new RegExp(`^${username}$`, 'i')
        }
    });
}

/*
=================================
CAPTURA FILE ID TELEGRAM
=================================
*/

async function handleCapturePhoto(ctx) {
    if (!isAdmin(ctx)) return;

    if (!ctx.message?.photo?.length) return;

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const caption = ctx.message.caption || 'sem_nome';

    console.log('==============================');
    console.log('🖼️ NOVA IMAGEM CAPTURADA');
    console.log('NOME:', caption);
    console.log('FILE ID:', photo.file_id);
    console.log('==============================');

    await ctx.reply(
        `✅ *Imagem capturada com sucesso*\n\n` +
        `📝 Nome: *${caption}*\n` +
        `🆔 File ID:\n\`${photo.file_id}\``,
        { parse_mode: 'Markdown' }
    );
}

/*
=================================
GIVE XP
=================================
*/

async function handleGiveXp(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3 || args[0].toLowerCase() !== 'xp') {
        return ctx.reply('📝 Uso: /give xp @usuario <quantidade>');
    }

    const username = args[1].replace('@', '');
    const amount = parseInt(args[2], 10);

    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    const player = await findPlayerByUsername(username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${username} não encontrado.`);
    }

    player.xp = (player.xp || 0) + amount;

    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${amount} XP adicionado para @${username}.`);
}

/*
=================================
GIVE GOLD
=================================
*/

async function handleGiveGold(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3 || args[0].toLowerCase() !== 'gold') {
        return ctx.reply('📝 Uso: /give gold @usuario <quantidade>');
    }

    const username = args[1].replace('@', '');
    const amount = parseInt(args[2], 10);

    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    const player = await findPlayerByUsername(username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${username} não encontrado.`);
    }

    player.gold = (player.gold || 0) + amount;

    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${amount} ouro adicionado para @${username}.`);
}

/*
=================================
GIVE NOX
=================================
*/

async function handleGiveNox(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3 || args[0].toLowerCase() !== 'nox') {
        return ctx.reply('📝 Uso: /give nox @usuario <quantidade>');
    }

    const username = args[1].replace('@', '');
    const amount = parseInt(args[2], 10);

    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    const player = await findPlayerByUsername(username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${username} não encontrado.`);
    }

    player.nox = (player.nox || 0) + amount;

    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${amount} NOX adicionado para @${username}.`);
}

/*
=================================
GIVE ITEM
=================================
*/

async function handleGiveItem(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3 || args[0].toLowerCase() !== 'item') {
        return ctx.reply('📝 Uso: /give item @usuario <nome>');
    }

    const username = args[1].replace('@', '');
    const itemName = args.slice(2).join(' ');

    const player = await findPlayerByUsername(username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${username} não encontrado.`);
    }

    const shopItem = shopItems.find(
        item => item.name.toLowerCase() === itemName.toLowerCase()
    );

    let item;

    if (shopItem) {
        item = {
            id: Date.now(),
            name: shopItem.name,
            slot: shopItem.slot || 'weapon',
            atk: shopItem.atk || 0,
            def: shopItem.def || 0,
            hp: shopItem.hp || 0,
            crit: shopItem.crit || 0,
            rarity: shopItem.rarity || 'Raro',
            level: 1,
            category: shopItem.category || 'weapon'
        };
    } else {
        item = generateDrop(1);
    }

    player.inventory = player.inventory || [];
    player.inventory.push(item);

    await savePlayer(player.id, player);

    return ctx.reply(`✅ Item "${item.name}" entregue para @${username}.`);
}

/*
=================================
BAN
=================================
*/

async function handleBan(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const username = ctx.message.text.split(' ')[1]?.replace('@', '');

    if (!username) {
        return ctx.reply('📝 Uso: /ban @usuario');
    }

    const player = await findPlayerByUsername(username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${username} não encontrado.`);
    }

    player.banned = true;

    await savePlayer(player.id, player);

    return ctx.reply(`🚫 @${username} foi banido.`);
}

/*
=================================
UNBAN
=================================
*/

async function handleUnban(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const username = ctx.message.text.split(' ')[1]?.replace('@', '');

    if (!username) {
        return ctx.reply('📝 Uso: /unban @usuario');
    }

    const player = await findPlayerByUsername(username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${username} não encontrado.`);
    }

    player.banned = false;

    await savePlayer(player.id, player);

    return ctx.reply(`✅ @${username} foi desbanido.`);
}

async function handleReload(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    return ctx.reply('🔄 Reload concluído.');
}

module.exports = {
    isAdmin,
    requireAdmin,
    handleCapturePhoto,
    handleGiveXp,
    handleGiveGold,
    handleGiveNox,
    handleGiveItem,
    handleBan,
    handleUnban,
    handleReload
};