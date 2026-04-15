# noctra-rpg-bot

Bot de RPG sombrio para Telegram com foco em combate por turnos, progressão de personagem e economia.

## Funcionalidades principais

- Combate com inimigos por mapa (`/hunt`) com interface inline.
- Sistema de energia com regeneração passiva.
- Progressão de nível, recompensas e loot.
- Inventário, loja, arena e utilitários de jogador.

## Fluxo de combate (resumo)

1. O jogador inicia a caça.
2. O bot busca um inimigo válido para o mapa atual.
3. Se houver inimigo, a energia é consumida e a luta começa.
4. A mensagem de batalha tenta usar **foto** do inimigo; se não houver asset, usa **texto** como fallback.

## Scripts

- `npm start`: inicia o bot.
- `npm run dev`: inicia com `nodemon`.
- `npm test`: executa testes unitários com `node --test`.
