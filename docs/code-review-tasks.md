# Revisão da base de código: problemas encontrados e tarefas sugeridas

## 1) Erro de digitação / padronização de nomes

**Problema encontrado**
Há vários arquivos chamados `Teste` sem extensão e praticamente vazios espalhados pelo `src/`, o que indica artefato de desenvolvimento e nomenclatura inconsistente para o repositório.

**Tarefa sugerida**
- Remover os arquivos `Teste` vazios ou renomeá-los para um padrão explícito (ex.: `.gitkeep` quando a intenção for manter diretório vazio).
- Incluir regra de validação (lint/script) para bloquear arquivos sem extensão e com nomes de placeholder.

**Critério de aceite**
- Nenhum arquivo `src/**/Teste` restante.
- Script de verificação falhando quando um novo placeholder for adicionado.

---

## 2) Correção de bug funcional

**Problema encontrado**
No fluxo de caça (`handleHunt`), a energia é consumida e persistida **antes** de validar se existe inimigo no mapa. Se `getRandomEnemy` retornar `null`, o usuário perde energia mesmo sem iniciar combate.

**Tarefa sugerida**
- Reordenar o fluxo para validar disponibilidade de inimigo antes de consumir/salvar energia.
- Como alternativa, em caso de mapa sem inimigo, reverter a energia consumida no mesmo fluxo.

**Critério de aceite**
- Quando não houver inimigos no mapa, a energia do jogador permanece inalterada.
- Teste automatizado cobrindo cenário com e sem inimigo.

---

## 3) Ajuste de comentário/discrepância de documentação

**Problema encontrado**
O comentário do handler principal diz “MENSAGEM ÚNICA COM FOTO”, porém o código possui fallback explícito para mensagem de texto quando não há imagem do inimigo.

**Tarefa sugerida**
- Atualizar comentário para refletir o comportamento real (foto **ou** texto).
- Expandir o `README.md` com visão geral dos fluxos de batalha e fallback de renderização.

**Critério de aceite**
- Comentário alinhado ao comportamento implementado.
- `README.md` contendo seção breve sobre o fluxo de combate e fallback de mensagem.

---

## 4) Melhoria de testes

**Problema encontrado**
Não há suíte de testes do projeto (somente testes em `node_modules`), reduzindo segurança para refatorações.

**Tarefa sugerida**
- Configurar framework de testes (Jest/Vitest) e criar testes unitários iniciais para módulos críticos:
  - `src/services/energyService.js`
  - `src/core/combat/damageCalc.js`
  - cenário de fluxo em `src/handlers/combat.js` (caça com/sem inimigo)
- Mockar `Math.random()` e relógio (`Date.now`) para casos determinísticos.

**Critério de aceite**
- Script `npm test` disponível.
- Cobertura mínima inicial (ex.: 60% nos módulos críticos definidos).
