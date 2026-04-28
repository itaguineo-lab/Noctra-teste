# ROADMAP OPERACIONAL — NOCTRA

Este roadmap serve para impedir dispersão. O NOCTRA já tem sistemas suficientes para uma alpha jogável; a prioridade agora é transformar sistemas existentes em retenção real.

---

## Norte do produto

```text
Caçar → Combater → Loot → Upgrade → Repetir
Level → Mapa → Boss → Dungeon → Alma → Build → Ranking → Guilda
```

Toda sprint precisa fortalecer pelo menos um desses pontos.

---

## Status atual

### Já funcional

- criação de personagem
- classes base: Guerreiro, Arqueiro e Mago
- menu principal
- perfil
- mapas
- caça
- combate PvE
- energia
- consumíveis
- drops V2
- inventário V3
- equipamentos e mão secundária
- almas base
- loja
- venda de loot
- premium QoL
- VIP
- Nox
- arena
- Glórias
- loja da arena
- baús da arena
- ranking
- dungeons
- daily rewards
- métricas básicas
- admin

### Ainda não validado

- retenção D1/D7/D30
- economia calibrada por dados reais
- funil de primeira alma
- funil de primeira dungeon concluída
- valor percebido do VIP
- valor percebido da Loja Arena
- progressão de midgame
- endgame social

---

## Prioridade 1 — Almas V2

### Por que agora

Almas são o primeiro sistema com potencial real de build. Elas conectam:

- boss
- dungeon
- loot raro
- progressão
- combate
- arena
- desejo de retorno

Sem uma boa UX de almas, o jogador não entende por que deve continuar caçando bosses.

### Escopo da sprint

1. Criar `src/renderers/soulRenderer.js`.
2. Melhorar tela de Almas no inventário.
3. Mostrar slots equipados com clareza.
4. Mostrar coleção com raridade, nível e efeito resumido.
5. Criar detalhe individual da alma.
6. Permitir equipar em slot específico quando necessário.
7. Melhorar texto de drop de alma no combate.
8. Adicionar testes para renderização e regras básicas.

### Fora do escopo

- criar dezenas de almas novas
- mudar dano das almas profundamente
- monetizar almas com Nox
- vender alma em loja
- criar guildas
- criar world boss

### Resultado esperado

O jogador precisa entender em menos de 5 segundos:

```text
quais almas possui
quais estão equipadas
o que cada uma faz
qual é rara
como equipar
por que vale buscar bosses
```

---

## Prioridade 2 — Balanceamento inicial

Depois de Almas V2, medir e ajustar:

- XP por mapa
- ouro por mapa
- chance de drop de item
- chance de drop de alma
- pity de alma
- chave de dungeon
- Glórias por vitória
- Glórias por baú
- preço da Loja Arena
- valor percebido do VIP

### Métricas mínimas

- combates iniciados
- combates vencidos
- combates perdidos
- energia gasta estimada
- itens dropados
- almas dropadas
- chaves dropadas
- dungeons iniciadas
- dungeons concluídas
- compras por ouro
- compras por Nox
- compras por Glórias

---

## Prioridade 3 — Dungeon V2

Dungeon deve ser pico de sessão, não só outro combate.

### Melhorias futuras

- tela de entrada por mapa
- preview dos 4 bosses
- recompensa final mais emocionante
- chance de alma mais clara
- ranking de dungeon
- histórico de melhores runs

### Regra econômica

Dungeon consome chave, não energia.

Chave deve continuar rara. Dungeon não deve se autoalimentar com chave garantida.

---

## Prioridade 4 — Métricas de retenção

A alpha precisa responder:

```text
quantos jogadores voltam no dia seguinte?
quantos chegam ao primeiro boss?
quantos dropam a primeira alma?
quantos abrem loja?
quantos usam arena?
quantos voltam por baú?
```

Sem isso, balanceamento vira achismo.

---

## Prioridade 5 — Refactor cirúrgico

Não refatorar tudo de uma vez.

Ordem recomendada:

1. `src/renderers/soulRenderer.js`
2. `src/renderers/combatRenderer.js`
3. `src/renderers/inventoryRenderer.js`
4. `src/renderers/shopRenderer.js`
5. quebrar `index.js` em `src/app/`
6. criar `src/core/loot/`

---

## Prioridade 6 — Social endgame

Somente depois da base estabilizada:

- guildas
- world boss
- bosses globais por horário
- eventos semanais
- temporada de arena
- títulos sazonais
- cosméticos raros

---

## Decisões fixas

- Nox não dropa em combate comum.
- Nox não compra vitória.
- Glórias são a moeda competitiva da Arena.
- Ouro é moeda base.
- Dungeon consome chave, não energia.
- Almas são skills/build, não cosmético.
- Cada jogador equipa até 2 almas.
- Subclasse emerge de equipamentos + stats + almas.

---

## Próxima sprint aprovada

```text
Sprint: Almas V2
Objetivo: transformar Almas em sistema claro, desejável e central para build.
Primeiro PR técnico: criar soulRenderer e testes.
Segundo PR: integrar soulRenderer no inventário.
Terceiro PR: melhorar drop visual de alma no combate.
```
