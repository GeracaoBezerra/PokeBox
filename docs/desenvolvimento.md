# Desenvolvimento: estrutura, ambiente e seed

Guia para quem vai rodar e mexer no código. O caminho rápido (tudo no Docker) está no [README](../README.md#como-rodar).

## Estrutura do repositório

```
.
├── backend/
│   ├── prisma/            schema, migrations, seed e cartas do seed (seed-data/cards.json e catalog-pt.json)
│   ├── docs/db.md         modelo de dados, constraints, migrations e seed
│   ├── docs/guia-backend  guia do backend e das regras de negócio (.md e .pdf)
│   ├── scripts/           seed-cards.ts (regera as cartas do seed), seed-if-empty.ts (seed só com o banco vazio, usado pelo Compose), sync-catalog.ts (catálogo da busca), clean-dist.mjs e copy-generated.mjs (build), bench-listings.sql (volume para medir o GET /listings), coverage-summary.mjs (tabela de cobertura no resumo da CI)
│   ├── test/integration/  testes de integração (*.int.test.ts) e support/ (app de teste, TCGdex falsa, globalSetup)
│   ├── Dockerfile         estágios dev e prod da API
│   └── src/
│       ├── server.ts      sobe a API: valida o env, monta o container e o app
│       ├── instrumentation.ts liga o OpenTelemetry (carregado com node --import)
│       ├── container.ts   raiz de composição: cria a infraestrutura e chama um build<Modulo>Module por módulo
│       ├── app.ts         createApp(container): middlewares, rotas dos módulos e tratador de erros
│       ├── modules/       um arquivo por módulo (auth, cards, collection, wishlist, listings, trading) que dá new nas classes
│       ├── routes/        URLs e middlewares de cada rota (createXRoutes(auth, controller))
│       ├── controllers/   classes: leem a requisição, validam com zod e respondem
│       ├── services/      classes com as regras de negócio, dependências pelo construtor
│       ├── repositories/  interfaces (<Nome>Repository.ts) e implementações Prisma (Prisma<Nome>Repository.ts), TransactionRunner e Unit of Work
│       ├── cards/         catálogo de cartas em camadas (decorators de cache), busca no catálogo local e busca esperta na TCGdex
│       ├── security/      PasswordHasher (bcrypt) e TokenSigner (JWT)
│       ├── errors/        AppError, erros de domínio e tradutores de erro
│       ├── lib/           logger (pino), prisma, tracing (withSpan) e seedIfEmpty
│       ├── mocks/ e types/ catálogo falso (USE_MOCK) e tipos do Express
│       ├── config/        env.ts (variáveis validadas com zod) e cors.ts (quem pode chamar a API pelo navegador)
│       ├── schemas/       validação de entrada (zod) e tipos de entrada
│       ├── middlewares/   autenticação e papéis, validação de cartas, limite de tentativas (rateLimit), log por requisição (requestLogger) e tratador de erros
│       ├── utils/         regras puras (testadas com jest)
│       └── docs/          especificação do Swagger
├── frontend/              app React (Vite), Dockerfile (dev, build, prod com nginx), nginx.conf e vercel.json
├── e2e/                   testes E2E com Cypress (package.json próprio, reset do banco e login rápido)
├── docs/                  arquitetura, API, regras, telas, testes, deploy, observabilidade, desenvolvimento, decisões técnicas (decisoes/), processo e uso de IA
├── .github/workflows/     ci.yml (testes), e2e.yml (Cypress), deploy.yml (testes, depois Render e Vercel) e catalog-sync.yml (catálogo da busca, toda segunda)
├── docker-compose.yml     banco, backend e frontend em modo desenvolvimento, mais o banco de teste (profile test) e o Jaeger (profile observabilidade)
├── docker-compose.prod.yml o que muda no modo produção local
├── Makefile               atalhos do dia a dia (make help)
├── LICENSE
└── .env.example           variáveis de ambiente
```

O backend segue as camadas **routes → controllers → services → repositories** e é escrito em **TypeScript**, com classes e injeção de dependência.

### TypeScript, classes e injeção de dependência

- **Build:** `npm run build` limpa `backend/dist/`, compila com `tsc` e copia o cliente gerado do Prisma. Roda também no Windows, sem `rm -rf`. `npm start` sobe `dist/server.js`. Em desenvolvimento, `npm run dev` usa `tsx watch`. `npm run typecheck` checa o código, os testes, o seed e os scripts. O TypeScript fica na versão 6, porque o ts-jest ainda não aceita a 7.
- **Ambiente validado:** `src/config/env.ts` valida as variáveis com zod quando a API sobe. A API não sobe, e diz qual variável está errada, quando:
  - falta `DATABASE_URL` ou ela não é uma URL;
  - `JWT_SECRET` tem menos de 16 caracteres (quem tinha um segredo curto no `.env` precisa trocar);
  - `JWT_EXPIRES_IN` não é um prazo como `1d`, `12h` ou `30m`;
  - `NODE_ENV` não é `development`, `test` ou `production`;
  - `USE_MOCK` não é `true` ou `false`;
  - `PORT`, `TCGDEX_BASE_URL`, `AUTH_RATE_LIMIT` (inteiro ≥ 0) ou `LOG_LEVEL` são inválidos;
  - um item de `CORS_ORIGIN` não é URL ou `CORS_ORIGIN_REGEX` não é uma regex válida.

  O seed (`npm run db:seed`) exige `DATABASE_URL`, `SEED_ADMIN_PASSWORD` e `SEED_DEMO_PASSWORD` (8 a 72 caracteres, diferentes entre si).
- **Docker:** o container roda as migrations e depois troca o shell pelo `node` (`exec`). Assim o `docker stop` chega à API, que fecha o servidor e a conexão com o banco antes de sair.
- **Raiz de composição:** `src/container.ts` cria o Prisma, o middleware de autenticação e o tratador de erros, e chama um `build<Modulo>Module(infra)` por módulo (`src/modules/`). Cada módulo dá `new` nos seus repositórios, services e controllers. Não usamos framework de DI (tsyringe, inversify): eles exigem decorators e `reflect-metadata` e escondem de onde vem cada dependência, sem ganho num backend deste tamanho.
- **Interfaces pequenas:** cada service depende só do que usa (ex.: o `WishlistService` recebe um `CollectionQuantityReader`, não o repositório inteiro). Nos testes, as dependências são objetos falsos passados no construtor, sem banco.
- **Padrões que dá para apontar no código:**

| Padrão | Onde | Para quê |
|---|---|---|
| Decorator | `src/cards/catalog/`: `LocalFirstCatalog` → `MemoryCachedCatalog` → `InFlightDedupCatalog` → `DbCachedCatalog` → `TcgdexClient` | cada camada acrescenta um comportamento (banco primeiro, memória por 1 h, junta pedidos iguais, cópia no banco atualizada por trás depois de 24 h, HTTP) sem mexer nas outras |
| Unit of Work | `PrismaUnitOfWorkFactory` em `src/repositories/` | ofertas, trocas e a desativação da conta recebem coleção, anúncios, ofertas, trocas e wishlist já dentro da mesma transação (RN-07) |
| Repository | `repositories/<Nome>Repository.ts` + `Prisma<Nome>Repository.ts` | o service conhece a interface, não o Prisma |
| Chain of Responsibility | `src/errors/translators/` | o tratador de erros tenta cada tradutor em ordem; erro novo = tradutor novo, sem mexer no tratador |
| Strategy | `PasswordHasher` (bcrypt) e `TokenSigner` (JWT) em `src/security/` | o `AuthService` não depende da biblioteca |
| Plano B (fallback) | `src/cards/search/`: `LocalCatalogFinder` → `SmartCardFinder` | os dois implementam `CardFinder`. A busca vai ao banco, com ou sem nome e com qualquer filtro (#158); só passa a vez para a busca na TCGdex num idioma ainda não sincronizado, ou com filtro de tipo, raridade ou categoria antes de o sync gravar esses dados. Na frente do catálogo, o `LocalFirstCatalog` responde a lista de sets e os valores dos filtros pelo banco. O `CardService` não sabe qual respondeu |

Com `USE_MOCK=true`, o módulo de cartas troca a pilha da TCGdex pelo `MockCatalog`.

SOLID princípio por princípio, com arquivos e os pontos fracos que ficaram: [`docs/arquitetura.md`](arquitetura.md).

## Variáveis de ambiente

Copie o exemplo e preencha. O arquivo `.env` fica **na raiz** e é lido pelo Docker, pelo backend e pelo Prisma.

```bash
cp .env.example .env
```

Exemplo para desenvolvimento local:

```env
POSTGRES_USER=pokebox
POSTGRES_PASSWORD=pokebox
POSTGRES_DB=pokebox
POSTGRES_PORT=5432

BACKEND_PORT=3000
DATABASE_URL=postgresql://pokebox:pokebox@localhost:5432/pokebox?schema=public
PRISMA_DATABASE_URL="postgresql://pokebox:pokebox@localhost:5432/pokebox?schema=public"

FRONTEND_PORT=5173

CORS_ORIGIN=http://localhost:5173,http://localhost:8080

JWT_SECRET=troque-por-um-segredo-com-16-ou-mais-caracteres
JWT_EXPIRES_IN=1d

SEED_ADMIN_PASSWORD=<8 a 72 caracteres>
SEED_DEMO_PASSWORD=<outra senha, diferente da do admin>
```

As outras variáveis (`USE_MOCK`, `AUTH_RATE_LIMIT`, `LOG_LEVEL`, `OTEL_*`, `CORS_ORIGIN_REGEX`) estão comentadas no `.env.example`; vazias, usam o padrão.

Use `localhost` nas URLs: dentro do Docker o `docker-compose.yml` troca o host para `tcg-db` sozinho.

`PORT` é a porta em que a API escuta. `BACKEND_PORT` é só a porta do seu computador que o Docker liga ao container da API. `CORS_ORIGIN` lista os sites que podem chamar a API pelo navegador; sem ele, valem `http://localhost:5173` e `http://localhost:8080`.

## Tudo no Docker: detalhes

O compose de desenvolvimento usa o estágio `dev` dos Dockerfiles: o front roda o servidor do Vite e o backend tem as ferramentas de desenvolvimento, por isso o seed funciona com `docker compose exec`. A API tem healthcheck no `/health`, e o front só sobe depois que ela responde.

Com o ambiente de desenvolvimento já rodando, execute `docker compose watch --no-up tcg-frontend` em outro terminal. Enquanto o comando estiver ativo, o Compose sincroniza as alterações do frontend com o container e o Vite atualiza a página automaticamente. Alterações em `package.json`, `package-lock.json` ou no Dockerfile do frontend reconstroem o serviço. Para subir o ambiente e iniciar a sincronização juntos, use `docker compose up --watch`.

O projeto do Compose se chama sempre `pokebox` (`name: pokebox` no `docker-compose.yml`), de qualquer pasta em que o repositório esteja. Assim, `docker compose ps`, `logs` e `exec` enxergam os mesmos containers mesmo com mais de uma cópia do repositório (por exemplo, `git worktree`), e o banco fica sempre no volume `pokebox_postgres_data`. Se você já tinha subido os containers de uma pasta com outro nome, o `docker compose up` reclama que o nome do container já está em uso: remova os antigos com `docker compose -p <nome-antigo> down` (sem `-v`, os dados do volume antigo continuam guardados) e suba de novo. O nome antigo aparece em `docker inspect tcg-db-banco --format '{{index .Config.Labels "com.docker.compose.project"}}'`.

## Banco no Docker, backend e frontend na máquina

Bom para desenvolver, porque o backend reinicia sozinho a cada alteração.

```bash
docker compose up -d tcg-db

cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev
```

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend chama a API em `http://localhost:3000`. Para outro endereço, defina `VITE_API_URL`.

## Modo produção no seu computador

Sobe as mesmas imagens que vão para a nuvem: API sem dependências de desenvolvimento, rodando com o usuário `node`, e front compilado servido pelo nginx.

```bash
make prod-up
```

| Serviço | Endereço |
|---|---|
| Frontend (nginx) | http://localhost:8080 |
| API | http://localhost:3000 |

Por baixo, o `make prod-up` roda `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --wait`. O segundo arquivo só troca o que muda em produção: o estágio dos Dockerfiles (`prod`), a porta do front (8080) e o `VITE_API_URL`, que o Vite grava no JavaScript na hora do build. Os containers têm o mesmo nome dos de desenvolvimento, então um modo substitui o outro. O banco é o mesmo, e os dados continuam. Para voltar: `make prod-down` e `docker compose up -d --build`.

O seed não roda dentro da imagem de produção, porque ela não tem o `tsx`: no modo produção o backend usa o comando da própria imagem (só migrations e API; o `docker-compose.prod.yml` desliga o comando com seed do compose de desenvolvimento). Se o banco estiver vazio, rode da sua máquina: `make seed`.

## Depois de puxar a develop

Se chegou dependência nova no `backend/package.json` (a migração para TypeScript trouxe várias), rode `cd backend && npm install` antes do `npm run dev`. Scripts locais que importam o código do backend, como um `playground.js`, rodam com `npx tsx playground.js`.

Se chegou migration nova (pasta `backend/prisma/migrations`), atualize o banco e o cliente do Prisma:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run db:seed
```

No Docker: `docker compose up -d --build tcg-backend` (aplica as migrations) e, se quiser os dados novos do seed, `make seed`. Com o banco já populado, a subida não roda o seed sozinha.

## Começar o banco do zero

Apaga **todos** os dados locais:

```bash
docker compose down -v
docker compose up -d --build
```

Com o banco vazio, o backend roda o seed sozinho na subida.

## Catálogo local da busca

A busca de cartas por nome (`GET /cards?name=`) procura numa cópia resumida de todas as cartas da TCGdex guardada no Postgres (tabela `CatalogCard`, #78). A mesma rota aceita `sort=recent`, `sort=wanted` e `sort=traded`: a ordenação acontece no banco antes da paginação, usando a ordem dos sets, as wishlists e as unidades de trocas concluídas. Essa cópia é preenchida por um script, não pela API:

```bash
cd backend
npm run catalog:sync
```

Sincroniza inglês e português (#157). Nesta etapa, busca os ~220 sets em inglês (cerca de 24 mil cartas) e os ~126 em português (93 com carta) (cerca de 14 mil), com uma pausa de 200 ms entre os sets para não sobrecarregar a TCGdex. Para um idioma só: `npm run catalog:sync -- pt` (aceita `en` e `pt`). Rodar de novo atualiza, não duplica. A TCGdex responde 502 e 503 em rajadas: o script segue com os outros sets e, no fim de cada idioma, tenta de novo os que falharam, em até três voltas (depois de 5, 15 e 30 s); a lista de sets de cada idioma ganha as mesmas voltas. Se um idioma falhar, o outro roda do mesmo jeito. O que ainda falhar é listado e o script termina com erro; basta rodar de novo.

Além das cartas, o sync grava a lista de sets na ordem da TCGdex (`CatalogSet`), os valores dos filtros (`CatalogFilterValue`) e o tipo, a raridade e a categoria de cada carta (#158), pelas listas filtradas da TCGdex (`/en/cards?types=eq:Fire`, cerca de 60 chamadas por idioma). Com isso, o painel de filtros, a busca com filtro e a lista sem nome respondem pelo banco, mesmo com a TCGdex fora e a API recém-reiniciada. Sync completo medido na máquina local: cerca de 3 min 40 s.

Por último, o sync guarda no `CardCache` o detalhe completo de cada carta (ataques, habilidades, variantes, preço de referência) (#192). Com isso, a página de detalhe e o adicionar à coleção ou à wishlist também respondem pelo banco em `en` e `pt`, mesmo para uma carta que ninguém abriu e com a TCGdex fora. São uma chamada por carta (a TCGdex não devolve o detalhe de várias de uma vez), quatro ao mesmo tempo, com as mesmas três voltas de nova tentativa. Por padrão, só busca o detalhe das cartas que ainda não têm: a primeira vez é longa (26 min para as ~38 mil cartas com o banco na própria máquina, e o `CardCache` ficou com 63 MB; com um banco remoto, como o Neon, demora mais, porque cada carta faz duas gravações), e as seguintes só pegam as cartas de sets novos (sync completo de novo: cerca de 3 min 40 s). Para buscar o detalhe de todas de novo: `npm run catalog:sync -- --refresh-details` (dá para combinar com o idioma: `npm run catalog:sync -- pt --refresh-details`). Os dados de uma carta quase nunca mudam depois do lançamento; o que muda é o preço, que é atualizado por trás quando alguém abre a carta (veja "Cache das cartas" em [`regras.md`](regras.md)). Carta que a TCGdex lista mas não tem detalhe aparece no fim do log e não conta como falha; para as que falham, o log mostra o motivo das 10 primeiras.

Sem o sync (banco novo), nada quebra: a busca usa a TCGdex, como antes. Depois do sync, a busca local já vale na próxima chamada, sem reiniciar a API.

## Ver o banco

- Prisma Studio: `cd backend && npx prisma studio` (abre no navegador).
- Ou qualquer cliente PostgreSQL (DBeaver, extensão do VS Code etc.) com os dados do `.env`.

## Seed

O seed cria 87 cartas reais (todas com imagem), 111 itens de coleção, que viram 121 depois das trocas concluídas (alguns privados, com quantidade maior que 1 e variantes holo, reverse e 1ª edição), 44 itens de wishlist (vários com cartas que outros têm), 30 anúncios (20 na vitrine com datas espalhadas: 18 ativos e, no fim, 2 **Em troca**, o Venusaur da `erika` e a Double Turbo da `cynthia`; 1 ativo do `lance`, que some da vitrine; 2 pausados, 1 bloqueado, 6 fechados, 4 deles pelas trocas concluídas), 16 ofertas (6 em aberto, uma delas **em espera**: a do `gary` no Venusaur da `erika`; 6 aceitas, todas com troca; 2 recusadas, 2 canceladas) e 6 trocas (4 concluídas e 2 em andamento, com as cartas reservadas: `brock` ↔ `erika`, já confirmada pela `erika` e esperando o `brock`, e `brock` ↔ `cynthia`, sem confirmação). Não há oferta aceita sem troca. Ofertas e trocas são criadas pelos mesmos services da API e pelo mesmo fluxo da tela (oferta, aceite que cria a troca, confirmações), então reservas e quantidades seguem as regras (RN-07 e RN-08).

Para a home e os rankings (#92), o seed também grava um mini catálogo nos dois idiomas, como o `catalog:sync`: em `en` as 87 cartas e em `pt` as 62 que existem em português na TCGdex (as coleções a partir de Black & White; as de Base Set a Diamond & Pearl só existem em inglês), com nomes, sets e filtros em português (`backend/prisma/seed-data/catalog-pt.json`). O ranking já sai claro: Umbreon VMAX em 7 wishlists, Charizard (Base Set) em 6, Charizard ex em 5 e Blastoise em 4 (a wishlist do `lance`, desativado, não conta); em português, sem as cartas antigas, fica Umbreon VMAX (7), Charizard ex (5) e Sylveon VMAX (2). Até rodar `npm run catalog:sync`, os filtros e a busca mostram só essas cartas. A seção "Mais desejadas" da home continua com o inglês de reserva (como na #185): se o ranking em português vier vazio, ela mostra o mesmo ranking em inglês, com as cartas e o "Ver todas" abrindo em `lang=en`. Erro na busca em português não dispara a reserva: aparece o aviso de sempre.

Rodar o seed de novo volta as ofertas em aberto do exemplo (como a da misty, que oferece o Mew holo pelo Charizard do ash) para `PROPOSED`, a não ser que já tenham virado troca ou o anúncio esteja em troca (aí o seed avisa; para recomeçar, `npx prisma migrate reset`, que apaga o banco local). As trocas só ganham a confirmação que faltar; as finalizadas e as ofertas recusadas ou canceladas do exemplo não são refeitas. Detalhes em [`backend/docs/db.md`](../backend/docs/db.md#seed).

O seed **pode rodar várias vezes** sem duplicar nada e funciona sem internet, porque as cartas ficam em `backend/prisma/seed-data/cards.json` (e o catálogo em português em `catalog-pt.json`).

## Testar rápido no Swagger

1. Abra http://localhost:3000/docs.
2. `POST /auth/login` com `{ "email": "ash@pokebox.dev", "password": "<SEED_DEMO_PASSWORD do seu .env>" }`. Clique em **Try it out**, troque a senha do exemplo pela do seu `.env` e clique em **Execute**. Os exemplos das outras rotas também seguem o seed (o Charizard do ash, a oferta da misty); o do cadastro usa `tracey`, que não está no seed, para não dar 409.
3. Copie o `token` da resposta, clique em **Authorize** e cole. O token fica salvo até fechar a aba (um F5 não desloga).
4. Chame `GET /collection`, `GET /wishlist`, `GET /listings/me`, `GET /offers/me`, `GET /trades/me` etc. Os ids que as outras rotas pedem saem dessas listas (a descrição de cada campo diz onde pegar).
5. Para conferir o papel ADMIN, `GET /auth/admin-check`: com `admin@pokebox.dev` dá 200; com o ash, 403.

O `/docs` chama a API no mesmo endereço em que foi aberto, então funciona em qualquer porta. Rotas sem cadeado não precisam de login. No detalhe da carta com `lang=pt`, use uma carta recente (ex.: `sv03.5-025`): a TCGdex não tem o Base Set em português e responde 404.
