# Combat Active Entrypoint

`src/handlers/combatActive.js` é o ponto canônico para o combate do NOCTRA.

O `index.js` deve importar somente este arquivo para registrar ações de combate.

## Cadeia atual

```text
combatActive -> combatFixed -> combat
```

`combatActive` agora é dono da correção do menu de almas. Ele usa `combatFixed` como base e sobrescreve `handleSoulMenu`.

`combatSoulFixed.js` permanece como legado temporário no repositório, mas não deve ser usado pelo runtime.

## Meta futura

```text
combatActive -> lógica consolidada final
```

A consolidação final deve reduzir dependência de `combatFixed` e quebrar responsabilidades em módulos menores quando fizer sentido.

## Regra prática

- não adicionar mecânica nova em `combat.js`;
- não trocar handler ativo sem teste;
- não importar `combatSoulFixed.js` no runtime;
- não remover wrappers antigos enquanto houver dependência real;
- qualquer mudança de combate precisa validar ataque, vitória, derrota, fuga, consumíveis, almas e loot.

## Teste manual obrigatório para mudanças de combate

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
