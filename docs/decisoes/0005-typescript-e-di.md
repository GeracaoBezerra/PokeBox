# 0005. TypeScript no backend com injeção de dependência manual

Data: 10/11/2026 · Issues #59 e #95 a #101 · PR #119

## Contexto

O backend era feito de funções soltas, e os testes trocavam módulos inteiros com `jest.unstable_mockModule`. O critério de maior peso da avaliação é POO e SOLID aplicados no código.

## Decisão

Migrar o backend para TypeScript, com classes, interfaces pequenas e uma raiz de composição (`backend/src/container.ts`). As dependências entram pelo construtor. A migração foi feita numa PR só, com um commit por módulo.

## Alternativas descartadas

- tsyringe e inversify: exigem decorators e `reflect-metadata` e escondem de onde vem cada dependência.
- TypeScript 7: o ts-jest ainda não aceita; ficamos no 6.

## Consequências

- Os testes passam versões falsas pelo construtor. Os testes de unidade foram de 465 para 625 na migração (hoje são 927).
- O `tsc` confere os contratos entre as camadas.
- A versão do TypeScript fica presa ao ts-jest.
