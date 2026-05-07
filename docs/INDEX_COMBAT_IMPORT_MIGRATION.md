# Migração do import de combate no index.js

## Estado atual

O `index.js` ainda importa diretamente:

```js
const combat = require('./src/handlers/combatSoulFixed');
```

Isso funciona, mas mantém o arquivo principal acoplado a um wrapper histórico.

## Próximo estado desejado

O `index.js` deve passar a importar:

```js
const combat = require('./src/handlers/combatActive');
```

## Motivo

`combatActive.js` é o entrypoint canônico criado para estabilizar o ponto de entrada do combate.

Ele permite que o `index.js` não precise mudar de novo quando a lógica interna for consolidada.

## Mudança manual exata

Trocar apenas esta linha:

```diff
- const combat = require('./src/handlers/combatSoulFixed');
+ const combat = require('./src/handlers/combatActive');
```

Não alterar callbacks, menus, handlers, imports de outras áreas ou ordem de registro.

## Validação obrigatória

Depois da troca:

```text
npm test
```

Teste manual no Telegram:

1. abrir menu;
2. caçar;
3. atacar;
4. vencer;
5. perder uma luta;
6. fugir;
7. usar Poção de Vida;
8. usar Poção de Energia;
9. abrir menu de Almas;
10. usar alma ativa;
11. confirmar alma passiva bloqueada como ativável;
12. ver item dropado;
13. equipar item dropado;
14. voltar ao menu.

## Critério de sucesso

O comportamento visível do jogador deve ser idêntico ao fluxo atual.

Esta migração não deve adicionar feature, mudar texto de combate, alterar balanceamento, mexer em loot ou tocar em energia.
