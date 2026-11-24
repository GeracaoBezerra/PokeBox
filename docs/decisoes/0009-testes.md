# 0009. Estratégia de testes

Datas: 29/10 a 20/11/2026 · Issues #106, #109, #179 a #182

## Decisão

| Camada | Ferramenta | O quê |
|---|---|---|
| Unidade (backend) | Jest + ts-jest | Regras puras e services com dependências falsas |
| Integração (backend) | Jest + Supertest + PostgreSQL real | A API inteira contra um banco de teste; a TCGdex é um servidor local falso |
| Front | Vitest + Testing Library + MSW | Componentes, hooks e páginas com a API simulada |
| E2E | Cypress | Fluxos completos no navegador com o Docker Compose |

- Integração sem mock do Prisma: o banco é real e descartável (porta 5433, só aceita banco com sufixo `_test`).
- Vitest no front porque reaproveita a configuração do Vite.
- Cypress porque é a ferramenta da aula. O Playwright seria a alternativa (mais rápido e com vários navegadores).
- O E2E reseta o banco por uma task do Cypress, sem rota na API: uma rota que apaga o banco seria perigosa se chegasse à produção.
- Cobertura mínima na CI igual ao valor medido menos uns 2 pontos (backend: 95% das linhas). 100% não é meta, porque incentiva teste que só pinta linha.

## Consequências

- 927 testes de unidade, 173 de integração, 364 do front e 11 E2E na bancada de 23/11; cobertura de 98,3% das linhas no backend e 68% no front.
- O E2E não é check obrigatório para o merge e parte dele depende da TCGdex.
