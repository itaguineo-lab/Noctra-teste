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
- Almas V2 no inventário
- detalhe individual de alma
- seleção de Slot 1 e Slot 2 para almas
- drop visual especial de alma na vitória
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

## Sprint concluída — Almas V2

### O que foi entregue

1. `src/renderers/soulRenderer.js`.
2. Tela de Almas no inventário usando renderer dedicado.
3. Slots equipados e slots vazios claros.
4. Coleção com raridade, tier, nível, XP, fragmentos e efeito resumido.
5. Detalhe individual da alma.
6. Escolha explícita de Slot 1 e Slot 2.
7. Substituição de slot com retorno da alma antiga para coleção.
8. Drop visual especial de alma na vitória.
9. Comando `/equipsoul ID [1|2]` alinhado com a lógica de slots.
10. Testes cobrindo renderer, detalhe, slot selection, comando e drop visual.

### Resultado esperado

O jogador agora deve entender em menos de 5 segundos:

```text
quais almas possui
quais estão equipadas
o que cada uma faz
qual é rara
como equipar
como escolher Slot 1 ou Slot 2
por que vale buscar bosses
```

### Fora do escopo ainda pendente

- balancear chance de drop de alma
- balancear pity
- criar novas almas em escala
- habilitar uso de almas dentro da dungeon
- criar fusão/upgrade visual avançado
- monetizar cosméticos ligados a alma, sem vender poder

---

## Próxima prioridade — Balanceamento inicial

Depois de Almas V2, o erro seria criar outro sistema grande sem medir economia.

O próximo bloco deve ajustar e proteger:

- XP por mapa
- ouro por mapa
- dificuldade inicial
- chance de drop de item
- chance de drop de alma
- pity de alma
- chance de chave de dungeon
- Glórias por vitória
- Glórias por baú
- preço da Loja Arena
- preço da loja principal
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

## Prioridade 2 — Dungeon V2

Dungeon deve ser pico de sessão, não só outro combate.

### Melhorias futuras

- tela de entrada por mapa
- preview dos 4 bosses
- recompensa final mais emocionante
- chance de alma mais clara
- uso real de almas dentro da dungeon
- ranking de dungeon
- histórico de melhores runs

### Regra econômica

Dungeon consome chave, não energia.

Chave deve continuar rara. Dungeon não deve se autoalimentar com chave garantida.

---

## Prioridade 3 — Métricas de retenção

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

## Prioridade 4 — Refactor cirúrgico

Não refatorar tudo de uma vez.

Ordem recomendada:

1. `src/renderers/combatRenderer.js`
2. `src/renderers/inventoryRenderer.js`
3. `src/renderers/shopRenderer.js`
4. quebrar `index.js` em `src/app/`
5. criar `src/core/loot/`

---

## Prioridade 5 — Social endgame

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
Sprint: Balanceamento Inicial
Objetivo: estabilizar economia, progressão, drops e ritmo antes de Dungeon V2.
Primeiro PR: criar diagnóstico de balanceamento com testes de configuração.
Segundo PR: ajustar XP/ouro/drop por mapa.
Terceiro PR: ajustar Glórias, baús e loja da arena.
```
