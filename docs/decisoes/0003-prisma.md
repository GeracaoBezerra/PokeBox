# 0003. Prisma como ORM e CHECKs em SQL escrito à mão

Data: outubro de 2026 · Issues #3, #4 e #78

## Decisão

Prisma 7 com `@prisma/adapter-pg`. As CHECKs (19 no total, como quantidade nunca negativa e reserva entre 0 e a quantidade) ficam em migrations SQL escritas à mão. As extensões e o índice de trigramas da busca também.

## Por quê

- Migrations versionadas no repositório, revisadas em PR e aplicadas igual em todo lugar (`prisma migrate deploy` ao subir a API).
- Cliente tipado, que casou com o TypeScript do backend.
- Fácil de usar e muito usado no mercado.
- O Prisma não declara CHECK nem extensão no schema, então essas partes vão em SQL.

## Consequências

- Falha de CHECK vira 422 e conflito de unique ou FK vira 409, pelo tradutor de erros do Prisma.
- Os índices criados à mão precisam ser repetidos no `schema.prisma`, senão o Prisma acusa diferença entre schema e banco.
- As interfaces de repositório ainda usam tipos do Prisma (ver [Pontos fracos conhecidos](../arquitetura.md#pontos-fracos-conhecidos)).
