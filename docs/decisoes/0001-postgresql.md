# 0001. PostgreSQL no lugar do MySQL

Data: 05/10/2026 · Issue #2

## Contexto

A aula pedia MySQL. O projeto precisava de um banco relacional com integridade forte (FK, unique, CHECK) e de um plano gratuito para publicar a aplicação.

## Decisão

PostgreSQL 17 no Docker local e PostgreSQL 18 no Neon, em produção. O professor aceitou a troca.

## Por quê

- Foi sugerido em aula e é mais completo que o MySQL nos pontos que o projeto usou depois: `SELECT ... FOR UPDATE` nas travas das trocas (RN-08), as extensões `pg_trgm` e `unaccent` na busca tolerante a erro de digitação (#78), índice GIN e colunas do tipo array (`types[]`).
- O Neon oferece PostgreSQL gratuito, sem prazo de expiração e com branches do banco para testar migrations.

## Consequências

- A busca do catálogo e as travas dependem de recursos do PostgreSQL. Voltar para MySQL exigiria reescrever essas partes.
- Versões diferentes entre local (17) e produção (18). Até agora nenhuma diferença apareceu.
