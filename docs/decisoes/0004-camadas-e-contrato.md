# 0004. Arquitetura em camadas e contrato único de resposta

Data: 13/10/2026 · PR #35

## Decisão

- Camadas: routes → controllers → services → repositories. Regras de negócio puras em `utils/*Rules.ts`.
- Toda resposta segue `{ success: true, data }` ou `{ success: false, error, details }`.
- Códigos: 400 para dado inválido (zod), 401 sem login, 403 sem permissão, 404 não encontrado, 409 conflito, 422 regra de negócio, 413 corpo grande demais.

## Por quê

O front trata qualquer resposta do mesmo jeito, e cada camada tem um motivo só para mudar. As regras puras são testadas sem banco.

## Consequências

Regras que dependem de outra tabela (ex.: não anunciar mais do que se tem) ficam no service, dentro de transação, e não no banco.
