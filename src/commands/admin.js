const { getPlayer, savePlayer, getPlayerCollection } = require('../core/player/playerService');
const { generateDrop } = require('../data/items');
const { shopItems } = require('../data/shopItems');

// ================================================
// MIDDLEWARE DE ADMINISTRADOR
// ================================================

function isAdmin(ctx) {
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
    return adminIds.includes(String(ctx.from.id));
}

function requireAdmin(ctx, next) {
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem usar este comando.');
    }
    return next();
}

// ================================================
// FUNÇÕES AUXILIARES
// ================================================

function extractTargetId(ctx) {
    // Tenta obter de uma menção (@usuario)
    const mentionEntity = ctx.message?.entities?.find(e => e.type === 'mention');
    if (mentionEntity) {
        const mentionText = ctx.message.text.substring(mentionEntity.offset, mentionEntity.offset + mentionEntity.length);
        return mentionText.replace('@', ''); // Retorna o username (não ID) – precisamos buscar no banco depois
    }
    // Tenta obter de uma resposta a uma mensagem
    if (ctx.message?.reply_to_message?.from) {
        return String(ctx.message.reply_to_message.from.id);
    }
    // Caso contrário, o alvo é o próprio usuário
    return String(ctx.from.id);
}

async function findPlayerByUsername(username) {
    const collection = await getPlayerCollection();
    // Busca por name (case-insensitive) – simplificado
    const player = await collection.findOne({ name: { $regex: new RegExp(`^${username}$`, 'i') } });
    return player;
}

// ================================================
// COMANDOS ADMINISTRATIVOS
// ================================================

// /give xp @usuario 1000
async function handleGiveXp(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3 || args[0].toLowerCase() !== 'xp') {
        return ctx.reply('📝 Uso: /give xp @usuario <quantidade>');
    }

    const targetUsername = args[1].replace('@', '');
    const amount = parseInt(args[2], 10);
    if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Quantidade inválida.');

    const player = await findPlayerByUsername(targetUsername);
    if (!player) return ctx.reply(`❌ Jogador @${targetUsername} não encontrado.`);

    player.xp = (player.xp || 0) + amount;
    await savePlayer(player.id, player);
    await ctx.reply(`✅ Adicionado ${amount} XP para @${targetUsername}.`);
}

// /give gold @usuario 1000
async function handleGiveGold(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3 || args[0].toLowerCase() !== 'gold') {
        return ctx.reply('📝 Uso: /give gold @usuario <quantidade>');
    }

    const targetUsername = args[1].replace('@', '');
    const amount = parseInt(args[2], 10);
    if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Quantidade inválida.');

    const player = await findPlayerByUsername(targetUsername);
    if (!player) return ctx.reply(`❌ Jogador @${targetUsername} não encontrado.`);

    player.gold = (player.gold || 0) + amount;
    await savePlayer(player.id, player);
    await ctx.reply(`✅ Adicionado ${amount} ouro para @${targetUsername}.`);
}

// /give nox @usuario 50
async function handleGiveNox(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3 || args[0].toLowerCase() !== 'nox') {
        return ctx.reply('📝 Uso: /give nox @usuario <quantidade>');
    }

    const targetUsername = args[1].replace('@', '');
    const amount = parseInt(args[2], 10);
    if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Quantidade inválida.');

    const player = await findPlayerByUsername(targetUsername);
    if (!player) return ctx.reply(`❌ Jogador @${targetUsername} não encontrado.`);

    player.nox = (player.nox || 0) + amount;
    await savePlayer(player.id, player);
    await ctx.reply(`✅ Adicionado ${amount} NOX para @${targetUsername}.`);
}

// /give item @usuario nome_do_item
async function handleGiveItem(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3 || args[0].toLowerCase() !== 'item') {
        return ctx.reply('📝 Uso: /give item @usuario <nome_do_item>');
    }

    const targetUsername = args[1].replace('@', '');
    const itemName = args.slice(2).join(' ');

    const player = await findPlayerByUsername(targetUsername);
    if (!player) return ctx.reply(`❌ Jogador @${targetUsername} não encontrado.`);

    // Tenta encontrar o item nos dados de loja ou gerar um drop temático
    const shopItem = shopItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    let item;
    if (shopItem) {
        // Cria um equipamento baseado no item da loja (se for equipamento)
        item = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            name: shopItem.name,
            slot: shopItem.slot || 'weapon',
            atk: shopItem.atk || 0,
            def: shopItem.def || 0,
            hp: shopItem.hp || 0,
            crit: shopItem.crit || 0,
            rarity: shopItem.rarity || 'Raro',
            level: 1,
            category: 'weapon'
        };
    } else {
        // Gera um drop aleatório do mapa atual do jogador
        const mapNumber = player.currentMap ? { clareira_sombria:1, cripta_em_ruinas:2, pantano_corrompido:3, deserto_incandescente:4 }[player.currentMap] || 1 : 1;
        item = generateDrop(mapNumber);
    }

    if (!item) return ctx.reply('❌ Não foi possível gerar o item.');

    player.inventory = player.inventory || [];
    if (player.inventory.length >= (player.maxInventory || 20)) {
        return ctx.reply(`❌ Inventário de @${targetUsername} está cheio.`);
    }

    player.inventory.push(item);
    await savePlayer(player.id, player);
    await ctx.reply(`✅ Item "${item.name}" adicionado ao inventário de @${targetUsername}.`);
}

// /ban @usuario
async function handleBan(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) return ctx.reply('📝 Uso: /ban @usuario');

    const targetUsername = args[0].replace('@', '');
    const player = await findPlayerByUsername(targetUsername);
    if (!player) return ctx.reply(`❌ Jogador @${targetUsername} não encontrado.`);

    player.banned = true;
    await savePlayer(player.id, player);
    await ctx.reply(`🚫 Jogador @${targetUsername} foi banido.`);
}

// /unban @usuario
async function handleUnban(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) return ctx.reply('📝 Uso: /unban @usuario');

    const targetUsername = args[0].replace('@', '');
    const player = await findPlayerByUsername(targetUsername);
    if (!player) return ctx.reply(`❌ Jogador @${targetUsername} não encontrado.`);

    player.banned = false;
    await savePlayer(player.id, player);
    await ctx.reply(`✅ Jogador @${targetUsername} foi desbanido.`);
}

// /reload (recarrega comandos - útil para dev)
async function handleReload(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('❌ Sem permissão.');
    // Placeholder – pode ser implementado com require.cache se necessário
    await ctx.reply('🔄 Comandos recarregados (simulado).');
}

module.exports = {
    isAdmin,
    requireAdmin,
    handleGiveXp,
    handleGiveGold,
    handleGiveNox,
    handleGiveItem,
    handleBan,
    handleUnban,
    handleReload
};