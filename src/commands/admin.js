const {
    savePlayer,
    getPlayerCollection
} = require('../core/player/playerService');

const { generateDrop } = require('../data/items');
const { shopItems } = require('../data/shopItems');
const {
    addInventoryItem,
    addGold,
    addNox,
    applyXpReward,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

/*
=================================
ADMIN AUTH
=================================
*/

function getAdminIds() {
    return process.env.ADMIN_IDS
        ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
        : [];
}

function isAdmin(ctx) {
    return getAdminIds().includes(String(ctx.from.id));
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

async function saveAdminPlayer(player) {
    normalizePlayerForSave(player);
    return savePlayer(player.id, player);
}

function parseGiveArgs(ctx, expectedType) {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3 || args[0].toLowerCase() !== expectedType) {
        return null;
    }

    return {
        username: args[1].replace('@', ''),
        rawValue: args.slice(2).join(' ')
    };
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

    const parsed = parseGiveArgs(ctx, 'xp');
    if (!parsed) {
        return ctx.reply('📝 Uso: /give xp @usuario <quantidade>');
    }

    const amount = parseInt(parsed.rawValue, 10);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    const player = await findPlayerByUsername(parsed.username);
    if (!player) {
        return ctx.reply(`❌ Jogador @${parsed.username} não encontrado.`);
    }

    applyXpReward(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} XP adicionado para @${parsed.username}.`);
}

/*
=================================
GIVE GOLD
=================================
*/

async function handleGiveGold(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const parsed = parseGiveArgs(ctx, 'gold');
    if (!parsed) {
        return ctx.reply('📝 Uso: /give gold @usuario <quantidade>');
    }

    const amount = parseInt(parsed.rawValue, 10);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    const player = await findPlayerByUsername(parsed.username);
    if (!player) {
        return ctx.reply(`❌ Jogador @${parsed.username} não encontrado.`);
    }

    addGold(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} ouro adicionado para @${parsed.username}.`);
}

/*
=================================
GIVE NOX
=================================
*/

async function handleGiveNox(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const parsed = parseGiveArgs(ctx, 'nox');
    if (!parsed) {
        return ctx.reply('📝 Uso: /give nox @usuario <quantidade>');
    }

    const amount = parseInt(parsed.rawValue, 10);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    const player = await findPlayerByUsername(parsed.username);
    if (!player) {
        return ctx.reply(`❌ Jogador @${parsed.username} não encontrado.`);
    }

    addNox(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} NOX adicionado para @${parsed.username}.`);
}

/*
=================================
GIVE ITEM
=================================
*/

async function handleGiveItem(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const parsed = parseGiveArgs(ctx, 'item');
    if (!parsed) {
        return ctx.reply('📝 Uso: /give item @usuario <nome>');
    }

    const itemName = parsed.rawValue;
    const player = await findPlayerByUsername(parsed.username);

    if (!player) {
        return ctx.reply(`❌ Jogador @${parsed.username} não encontrado.`);
    }

    let item;

    const shopItem = shopItems.find(
        entry => entry.name.toLowerCase() === itemName.toLowerCase()
    );

    if (shopItem && shopItem.type === 'equipment') {
        item = {
            id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            name: shopItem.name,
            slot: shopItem.slot || 'weapon',
            atk: shopItem.atk || 0,
            def: shopItem.def || 0,
            hp: shopItem.hp || 0,
            crit: shopItem.crit || 0,
            rarity: shopItem.rarity || 'Raro',
            level: 1,
            category: shopItem.category || 'weapon',
            classRestriction: shopItem.classRestriction || null
        };
    } else {
        item = generateDrop(1);
    }

    const addResult = addInventoryItem(player, item);
    if (!addResult.success) {
        return ctx.reply(`❌ ${addResult.message}`);
    }

    await saveAdminPlayer(player);

    return ctx.reply(`✅ Item "${item.name}" entregue para @${parsed.username}.`);
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
    await saveAdminPlayer(player);

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
    await saveAdminPlayer(player);

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