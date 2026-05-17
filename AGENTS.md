# AGENTS.md — Guia Mestre de Operação (escopo: raiz)

Este documento define o padrão obrigatório para qualquer agente de IA atuando no repositório `itaguineo-lab/Noctra-teste`.
Escopo: todo o repositório.

---

## 1) Missão de produto
NOCTRA é um produto comercial real (RPG sombrio para Telegram), não um hobby.
Toda decisão técnica deve priorizar:
- estabilidade de produção
- retenção e progressão de longo prazo
- economia sustentável
- UX clara e fluida no Telegram

Tom de resposta esperado do agente:
- direto
- técnico
- estratégico
- prático
- sem inventar arquitetura não verificada

---

## 2) Leitura obrigatória antes de alterar qualquer arquivo
1. `package.json`
2. `index.js`
3. `docs/AI_SYSTEM_PROMPT.md`
4. este `AGENTS.md`

Sem essa leitura, a tarefa não deve avançar.

---

## 3) Stack oficial
- Node.js
- Telegraf
- MongoDB/Mongoose
- dotenv
- fs-extra
- GitHub
- Render
- Telegram Bot API

Entrada principal:
- `index.js`

Variáveis essenciais:
- `BOT_TOKEN`
- `MONGODB_URI` (ou `MONGO_URI`)
- `PORT` (quando aplicável no Render)

---

## 4) Scripts oficiais
- `npm start` → `node index.js`
- `npm run dev` → `nodemon index.js`
- `npm test` → `node --test`

---

## 5) Regras absolutas de implementação
1. Não inventar função, callback, import, export, schema, arquivo ou estrutura.
2. Alterar apenas os arquivos estritamente necessários para a tarefa.
3. Preservar callbacks existentes do Telegram (especialmente os registrados em `index.js`).
4. Preservar compatibilidade de dados (documentos legados, PlayerModel, playerService, saves antigos).
5. Nunca alterar `main` diretamente: trabalhar em branch + PR.
6. Não remover lógica existente sem justificar risco, impacto e plano de validação.
7. Em mudanças sensíveis (combate/economia/dungeon), validar efeito colateral em retenção e progressão.

---

## 6) Economia NOX (regra crítica)
1. **Nox nunca pode dropar em combate comum**.
2. Não introduzir geração passiva ilimitada de moeda premium.
3. Loja NOX deve evitar pay-to-win agressivo.
4. Recompensas premium devem preservar equilíbrio entre conveniência e integridade competitiva.

---

## 7) Classes oficiais
Classes oficiais permitidas:
- guerreiro
- arqueiro
- mago

Não adicionar classe nova sem solicitação explícita e validação de balanceamento.

---

## 8) Atributos oficiais
Atributos centrais obrigatórios:
- `atk`
- `hp`
- `def`
- `crit`

Evitar mudanças que desalinhem fórmulas de dano, sobrevivência e progressão desses atributos.

---

## 9) Energia
1. Preservar regras oficiais de regeneração e consumo.
2. Não criar loop de gameplay sem custo energético.
3. Ajustes devem manter sessões curtas viáveis sem quebrar pacing.
4. Evitar alterações que acelerem progressão por spam sem trade-off.

---

## 10) Mapas atuais
1. Respeitar progressão oficial por nível e gates de desbloqueio.
2. Preservar pools de inimigos por mapa.
3. Validar coerência entre mapa, tier de drop e dificuldade.
4. Mudanças em mapas exigem validação de assets e testes de progressão.

---

## 11) Dungeon
1. Preservar fluxo oficial: preparação → entrada → salas → conclusão/abandono.
2. Não permitir bypass de custo de chave.
3. Preservar lock de dungeon ativa e callbacks relacionados.
4. Recompensas devem seguir política de raridade vigente.
5. Evitar designs que transformem dungeon em fonte infinita de valor sem risco.

---

## 12) Almas
1. Preservar slots, equipar/desequipar, cooldown e passivas.
2. Preservar compatibilidade entre `id` base e `instanceId` quando aplicável.
3. Não transformar almas em power creep descontrolado.
4. Manter clareza de UX (estado ativo/passivo/cooldown) para o jogador.

---

## 13) Inventário
1. Preservar limites de inventário, expansões e regras de overflow.
2. Preservar metadados e identidade dos itens.
3. Proibir perda silenciosa de itens.
4. Garantir callbacks curtos/seguros para limites do Telegram quando necessário.

---

## 14) Combate
1. Preservar `combatActive` como entrypoint canônico, salvo instrução explícita contrária.
2. Não quebrar callbacks de combate (`combat_attack`, `combat_defend` e correlatos).
3. Evitar regressões no turn loop, drops, cura, buffs/debuffs e sync do estado do player.
4. Mudanças de combate devem considerar impacto em economia e ritmo de progressão.

---

## 15) UX Telegram
1. Mensagens: objetivas, legíveis e sem ruído técnico para jogador final.
2. Menus: navegação previsível, consistente e sem dead-ends.
3. Evitar fricção extra em fluxos de alta frequência (caçar, inventário, loja, dungeon).
4. Respeitar limites de callback_data e robustez de edição/remoção de mensagens.

---

## 16) Testes obrigatórios
1. Alterou código? Rodar `npm test` antes de concluir.
2. Alterou documentação/processo? Rodar `npm test` para confirmar não-regressão.
3. Reportar no fechamento:
   - comando executado
   - resultado
   - risco residual

---

## 17) Formato obrigatório de PR
Todo PR deve incluir:
1. Resumo técnico objetivo.
2. Arquivos alterados.
3. Testes executados + resultado.
4. Riscos técnicos, econômicos e de UX.
5. Como validar localmente.
6. Como validar no Telegram.
7. Pontos para revisão humana.

Checklist rápido de PR:
- [ ] Escopo mínimo
- [ ] Sem quebra de callbacks existentes
- [ ] Sem quebra de economia NOX
- [ ] `npm test` executado
- [ ] Riscos documentados

---

## 18) Regra final de qualidade da resposta
Toda resposta técnica deve apontar explicitamente:
- riscos e trade-offs
- possíveis gargalos
- impacto em retenção/economia/UX
- próximo passo concreto recomendável
