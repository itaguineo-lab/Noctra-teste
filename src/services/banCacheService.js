/*
=================================
NOCTRA — BAN CACHE SERVICE

Problema resolvido:
O middleware anti-ban original chamava getPlayer() completo em TODA
interação (botões, comandos, textos). Cada clique disparava uma leitura
completa no MongoDB, incluindo populate de inventário, equipamentos,
buffs, soulsEquipped etc.

Com 100 jogadores ativos fazendo combate (5-10 cliques por sessão),
isso resultava em centenas de queries pesadas por minuto sem nenhum
valor adicional — a única informação necessária era `banned: true/false`.

Solução:
Cache em memória com TTL de 5 minutos.
- Buscas leves no MongoDB (só o campo `banned`)
- Cache invalidado imediatamente ao banir/desbanir via admin
- Thread-safe para single-process (Node.js event loop)
- Sem dependências externas (sem Redis necessário no MVP)

Limitação conhecida:
Em deploy multi-instância (ex: Render com múltiplos workers), o cache
não é compartilhado entre processos. Para esse cenário, usar Redis ou
aceitar o lag de até TTL_MS entre instâncias (aceitável para banimento).
=================================
*/

const Player = require('../core/player/PlayerModel');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/*
Estrutura: Map<userId: string, { banned: boolean, expiresAt: number }>
*/
const banCache = new Map();

/*
=================================
CONSULTA COM CACHE
=================================
*/

async function isBanned(userId) {
    const key = String(userId);
    const now = Date.now();

    const cached = banCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.banned;
    }

    /*
    Busca leve: somente o campo `banned`.
    Evita carregar inventário, equipamentos, buffs, etc.
    */
    let banned = false;

    try {
        const doc = await Player.findOne(
            { id: key },
            { banned: 1 }
        ).lean();

        banned = Boolean(doc?.banned);
    } catch (error) {
        /*
        Em caso de erro de DB, deixa passar para não bloquear
        interações legítimas por instabilidade de conexão.
        */
        console.error(`⚠️ banCacheService.isBanned erro para userId=${key}:`, error?.message);
        return false;
    }

    banCache.set(key, {
        banned,
        expiresAt: now + CACHE_TTL_MS
    });

    return banned;
}

/*
=================================
INVALIDAÇÃO IMEDIATA
Chamar ao banir ou desbanir um jogador via admin.
=================================
*/

function invalidateBanCache(userId) {
    banCache.delete(String(userId));
}

/*
=================================
LIMPEZA PERIÓDICA
Evita acúmulo de entradas expiradas em memória.
Chamar no startup ou via setInterval se necessário.
=================================
*/

function purgeBanCache() {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of banCache.entries()) {
        if (entry.expiresAt <= now) {
            banCache.delete(key);
            purged++;
        }
    }

    if (purged > 0) {
        console.log(`🧹 banCache: ${purged} entradas expiradas removidas.`);
    }

    return purged;
}

/*
=================================
TAMANHO DO CACHE (debug)
=================================
*/

function getBanCacheSize() {
    return banCache.size;
}

module.exports = {
    isBanned,
    invalidateBanCache,
    purgeBanCache,
    getBanCacheSize
};
