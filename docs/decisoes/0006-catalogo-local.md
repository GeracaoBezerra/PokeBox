# 0006. Cache da TCGdex em camadas e catálogo local no banco

Datas: 13/10 a 18/11/2026 · Issues #74, #78, #145, #157, #158 e #192

## Contexto

Na apresentação do MVP, a busca foi o ponto mais criticado (`charizard base` não achava nada). A TCGdex falha em rajadas de 502 e 503, e o Render reinicia a API e perde o que estava em memória.

## Decisão

- Cache das cartas em camadas (Decorator): memória por 1 h, junção de pedidos iguais, cópia no banco (`CardCache`) que responde na hora e é atualizada por trás depois de 24 h, e só então a TCGdex.
- Catálogo local no PostgreSQL (`CatalogCard`) em inglês e português, com busca por trigramas (`pg_trgm` + `unaccent`) que tolera erro de digitação.
- Filtros, sets e o detalhe de todas as cartas também vêm do banco. Um workflow semanal (`catalog-sync.yml`) atualiza tudo.
- Até 2 novas tentativas quando a TCGdex falha; sem nada guardado, a API responde 502 ou 504 e a tela mostra "Tentar de novo".

## Alternativas descartadas

- Busca full text com `tsvector`: não perdoa erro de digitação em nomes curtos.
- Elasticsearch ou Algolia: mais um serviço, fora do plano gratuito.

## Consequências

- `charzard` passou de 33,4 ms para 1,5 ms, e o app funciona com a TCGdex fora do ar em `en` e `pt`.
- A primeira carga do catálogo é demorada (de 26 min a algumas horas, conforme a máquina e a TCGdex); as semanais levam poucos minutos.
- Idiomas fora do sync ainda dependem da TCGdex.
