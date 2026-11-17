# PokeBox

Plataforma para colecionadores de cartas **Pokémon TCG**: organizar a coleção, montar a wishlist, ver a coleção pública de outros colecionadores e **trocar cartas** entre si.

O PokeBox é **só de trocas**. Não existe venda, preço de venda nem pagamento. O preço que aparece nas cartas é uma **referência de mercado** (vinda da TCGdex), útil para comparar o que se dá e o que se recebe numa troca.

Projeto em equipe do curso **Geração Tech**.

O PokeBox é um projeto de estudo, sem ligação com a The Pokémon Company, Nintendo ou Game Freak.

> Este README descreve o que está na branch `develop`.

## Sumário

- [Stack](#stack)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Usuários de teste (seed)](#usuários-de-teste-seed)
- [Testes](#testes)
- [Deploy](#deploy)
- [Logs e saúde da API](#logs-e-saúde-da-api)
- [Traces](#traces)
- [Performance e segurança](#performance-e-segurança)
- [API](#api)
- [Regras de negócio](#regras-de-negócio)
- [Status do projeto](#status-do-projeto)
- [Como contribuir](#como-contribuir)

## Stack

| Parte | Tecnologia |
|---|---|
| Backend | Node.js (LTS), TypeScript 6, Express 5, Prisma 7 (`@prisma/adapter-pg`), zod 4, JWT, bcrypt |
| Banco | PostgreSQL 17 |
| Frontend | React 19, Vite, React Router, axios |
| Dados das cartas | API pública [TCGdex](https://tcgdex.dev), com cache no banco e uma cópia resumida de todas as cartas para a busca (`pg_trgm` + `unaccent`) |
| Testes | Jest com ts-jest (backend), ESLint e build (frontend) |
| Documentação da API | Swagger em `/docs` |
| Infra | Docker Compose (modo dev e modo produção), GitHub Actions (CI e deploy), Render (API), Neon (banco), Vercel (front) |

## Estrutura do repositório

```
.
├── backend/
│   ├── prisma/            schema, migrations, seed e cartas do seed (seed-data/cards.json)
│   ├── docs/db.md         modelo de dados, constraints, migrations e seed
│   ├── docs/guia-backend  guia do backend e das regras de negócio (.md e .pdf)
│   ├── scripts/           seed-cards.ts (regera as cartas do seed), sync-catalog.ts (catálogo da busca), clean-dist.mjs e copy-generated.mjs (build)
│   ├── Dockerfile         estágios dev e prod da API
│   └── src/
│       ├── server.ts      sobe a API: valida o env, monta o container e o app
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
│       ├── config/        env.ts (variáveis validadas com zod) e cors.ts (quem pode chamar a API pelo navegador)
│       ├── schemas/       validação de entrada (zod) e tipos de entrada
│       ├── middlewares/   autenticação, papéis, validação e tratador de erros
│       ├── utils/         regras puras (testadas com jest)
│       └── docs/          especificação do Swagger
├── frontend/              app React (Vite), Dockerfile (dev, build, prod com nginx), nginx.conf e vercel.json
├── .github/workflows/     ci.yml (testes), deploy.yml (testes, depois Render e Vercel) e catalog-sync.yml (catálogo da busca, toda segunda)
├── docker-compose.yml     banco, backend e frontend em modo desenvolvimento
├── docker-compose.prod.yml o que muda no modo produção local
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
  - `USE_MOCK` não é `true` ou `false`.

  O seed (`npm run db:seed`) só exige `DATABASE_URL`.
- **Docker:** o container roda as migrations e depois troca o shell pelo `node` (`exec`). Assim o `docker stop` chega à API, que fecha o servidor e a conexão com o banco antes de sair.
- **Raiz de composição:** `src/container.ts` cria o Prisma, o middleware de autenticação e o tratador de erros, e chama um `build<Modulo>Module(infra)` por módulo (`src/modules/`). Cada módulo dá `new` nos seus repositórios, services e controllers. Não usamos framework de DI (tsyringe, inversify): eles exigem decorators e `reflect-metadata` e escondem de onde vem cada dependência, sem ganho num backend deste tamanho.
- **Interfaces pequenas:** cada service depende só do que usa (ex.: o `WishlistService` recebe um `CollectionQuantityReader`, não o repositório inteiro). Nos testes, as dependências são objetos falsos passados no construtor, sem banco.
- **Padrões que dá para apontar no código:**

| Padrão | Onde | Para quê |
|---|---|---|
| Decorator | `src/cards/catalog/`: `MemoryCachedCatalog` → `InFlightDedupCatalog` → `DbCachedCatalog` → `TcgdexClient` | cada camada acrescenta um comportamento (memória por 1 h, junta pedidos iguais, cache no banco por 24 h, HTTP) sem mexer nas outras |
| Unit of Work | `PrismaUnitOfWorkFactory` em `src/repositories/` | ofertas e trocas recebem coleção, anúncios, ofertas, trocas e wishlist já dentro da mesma transação (RN-07) |
| Repository | `repositories/<Nome>Repository.ts` + `Prisma<Nome>Repository.ts` | o service conhece a interface, não o Prisma |
| Chain of Responsibility | `src/errors/translators/` | o tratador de erros tenta cada tradutor em ordem; erro novo = tradutor novo, sem mexer no tratador |
| Strategy | `PasswordHasher` (bcrypt) e `TokenSigner` (JWT) em `src/security/` | o `AuthService` não depende da biblioteca |
| Plano B (fallback) | `src/cards/search/`: `LocalCatalogFinder` → `SmartCardFinder` | os dois implementam `CardFinder`. A busca vai ao banco; sem catálogo sincronizado no idioma, sem nome ou com filtro que o banco não tem, passa a vez para a busca na TCGdex. O `CardService` não sabe qual respondeu |

Com `USE_MOCK=true`, o módulo de cartas troca a pilha da TCGdex pelo `MockCatalog`.

## Como rodar

### Pré-requisitos

- Docker e Docker Compose
- Node.js LTS, se for rodar sem Docker ou rodar os testes

### 1. Variáveis de ambiente

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
```

Use `localhost` nas URLs: dentro do Docker o `docker-compose.yml` troca o host para `tcg-db` sozinho.

`PORT` é a porta em que a API escuta. `BACKEND_PORT` é só a porta do seu computador que o Docker liga ao container da API. `CORS_ORIGIN` lista os sites que podem chamar a API pelo navegador; sem ele, valem `http://localhost:5173` e `http://localhost:8080`.

### 2a. Tudo no Docker

```bash
docker compose up -d --build
docker compose exec tcg-backend npm run db:seed
```

O backend aplica as migrations sozinho ao subir (`prisma migrate deploy`). O seed é manual.

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| Saúde da API | http://localhost:3000/health |
| PostgreSQL | `localhost:5432` |

O compose de desenvolvimento usa o estágio `dev` dos Dockerfiles: o front roda o servidor do Vite e o backend tem as ferramentas de desenvolvimento, por isso o seed funciona com `docker compose exec`. A API tem healthcheck no `/health`, e o front só sobe depois que ela responde.

O projeto do Compose se chama sempre `pokebox` (`name: pokebox` no `docker-compose.yml`), de qualquer pasta em que o repositório esteja. Assim, `docker compose ps`, `logs` e `exec` enxergam os mesmos containers mesmo com mais de uma cópia do repositório (por exemplo, `git worktree`), e o banco fica sempre no volume `pokebox_postgres_data`. Se você já tinha subido os containers de uma pasta com outro nome, o `docker compose up` reclama que o nome do container já está em uso: remova os antigos com `docker compose -p <nome-antigo> down` (sem `-v`, os dados do volume antigo continuam guardados) e suba de novo. O nome antigo aparece em `docker inspect tcg-db-banco --format '{{index .Config.Labels "com.docker.compose.project"}}'`.

### 2b. Banco no Docker, backend e frontend na máquina

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

### 2c. Modo produção no seu computador

Sobe as mesmas imagens que vão para a nuvem: API sem dependências de desenvolvimento, rodando com o usuário `node`, e front compilado servido pelo nginx.

```bash
make prod-up
```

| Serviço | Endereço |
|---|---|
| Frontend (nginx) | http://localhost:8080 |
| API | http://localhost:3000 |

Por baixo, o `make prod-up` roda `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --wait`. O segundo arquivo só troca o que muda em produção: o estágio dos Dockerfiles (`prod`), a porta do front (8080) e o `VITE_API_URL`, que o Vite grava no JavaScript na hora do build. Os containers têm o mesmo nome dos de desenvolvimento, então um modo substitui o outro. O banco é o mesmo, e os dados continuam. Para voltar: `make prod-down` e `docker compose up -d --build`.

O seed não roda dentro da imagem de produção, porque ela não tem o `tsx`. Se o banco estiver vazio, rode da sua máquina: `cd backend && npm run db:seed`.

### Depois de puxar a develop

Se chegou dependência nova no `backend/package.json` (a migração para TypeScript trouxe várias), rode `cd backend && npm install` antes do `npm run dev`. Scripts locais que importam o código do backend, como um `playground.js`, rodam com `npx tsx playground.js`.

Se chegou migration nova (pasta `backend/prisma/migrations`), atualize o banco e o cliente do Prisma:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run db:seed
```

No Docker: `docker compose up -d --build tcg-backend` e rode o seed de novo.

### Começar o banco do zero

Apaga **todos** os dados locais:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec tcg-backend npm run db:seed
```

### Catálogo local da busca

A busca de cartas por nome (`GET /cards?name=`) procura numa cópia resumida de todas as cartas da TCGdex guardada no Postgres (tabela `CatalogCard`, #78). Essa cópia é preenchida por um script, não pela API:

```bash
cd backend
npm run catalog:sync
```

Sincroniza inglês e português (#157) e leva perto de 3 minutos: busca os ~220 sets em inglês (cerca de 24 mil cartas) e os ~126 em português (cerca de 14 mil), com uma pausa de 200 ms entre os sets para não sobrecarregar a TCGdex. Para um idioma só: `npm run catalog:sync -- pt`. Rodar de novo atualiza, não duplica. A TCGdex responde 502 e 503 em rajadas: o script segue com os outros sets e, no fim de cada idioma, tenta de novo os que falharam, em até três voltas (depois de 5, 15 e 30 s). Se algum ainda falhar, ele lista e termina com erro; basta rodar de novo.

Sem o sync (banco novo), nada quebra: a busca usa a TCGdex, como antes. Depois do sync, a busca local já vale na próxima chamada, sem reiniciar a API.

### Ver o banco

- Prisma Studio: `cd backend && npx prisma studio` (abre no navegador).
- Ou qualquer cliente PostgreSQL (DBeaver, extensão do VS Code etc.) com os dados do `.env`.

## Usuários de teste (seed)

As senhas não ficam no repositório: vêm do `.env`. `SEED_ADMIN_PASSWORD` é a do `admin`; `SEED_DEMO_PASSWORD` é a de todos os outros usuários. As duas são obrigatórias, têm de 8 a 72 caracteres e precisam ser diferentes; sem elas o seed para e diz o que falta. Peça os valores ao time ou escolha os seus no seu `.env`. Rodar o seed de novo aplica as senhas atuais do `.env` a todos os usuários do seed.

| Usuário | E-mail | Papel | Cidade | O que tem |
|---|---|---|---|---|
| `admin` | `admin@pokebox.dev` | ADMIN | | nada na coleção; serve para a moderação (há um anúncio do `gary` bloqueado) |
| `ash` | `ash@pokebox.dev` | USER | São Paulo/SP | 13 itens: Charizard holo 1ª edição e Pikachu VMAX (anunciados), Pikachus, Ultra Ball (4), Furret e Lightning Energy (privados) |
| `misty` | `misty@pokebox.dev` | USER | Rio de Janeiro/RJ | 12 itens: Blastoise holo e Gyarados (anunciados), Greninja ex (anúncio pausado), Mew ex holo, Fire Energy (10), cartas de água |
| `brock` | `brock@pokebox.dev` | USER | Belo Horizonte/MG | 17 itens: Palkia, Garchomp ex, Snorlax VMAX, Iono (anunciados); uma troca concluída com a `erika` e uma troca **aberta** com a `cynthia` |
| `gary` | `gary@pokebox.dev` | USER | Curitiba/PR | 18 itens: vários Charizard (anunciados, um **bloqueado** pelo admin); troca concluída com a `cynthia` |
| `erika` | `erika@pokebox.dev` | USER | Porto Alegre/RS | 15 itens: Venusaur, Celebi V, Sylveon VMAX (anunciados), Nest Ball (pausado); recebeu uma oferta aceita do `brock` que ainda não virou troca |
| `dawn` | `dawn@pokebox.dev` | USER | Recife/PE | 10 itens, todos **privados**: o perfil público dela aparece vazio |
| `cynthia` | `cynthia@pokebox.dev` | USER | Florianópolis/SC | 22 itens raros: Umbreon VMAX alt art, Lugia 1ª edição, Mew ex dourado (anunciados); troca aberta com o `brock` esperando ela aceitar |
| `lance` | `lance@pokebox.dev` | USER | Salvador/BA | conta **desativada**: não entra, o perfil dá 404, o anúncio dele some da vitrine e as cartas dele não contam nas oportunidades da wishlist |

O seed cria 87 cartas reais (todas com imagem), 111 itens de coleção, que viram 117 depois das trocas concluídas (alguns privados, com quantidade maior que 1 e variantes holo, reverse e 1ª edição), 30 itens de wishlist (3 ou 4 por usuário, vários com cartas que outros têm), 30 anúncios (21 ativos na vitrine com datas espalhadas, 2 pausados, 1 bloqueado, os outros fechados), 13 ofertas (5 em aberto, 4 aceitas, 2 recusadas, 2 canceladas) e 3 trocas (2 concluídas e 1 aberta, com as cartas reservadas). Ofertas e trocas são criadas pelos mesmos services da API, então reservas e quantidades seguem as regras (RN-07 e RN-08).

Rodar o seed de novo volta as ofertas em aberto do exemplo (como a da misty, que oferece o Mew holo pelo Charizard do ash) para `PROPOSED`, a não ser que já tenham virado troca (aí o seed avisa; para recomeçar, `npx prisma migrate reset`, que apaga o banco local). As trocas e as ofertas finalizadas do exemplo não são refeitas. Detalhes em [`backend/docs/db.md`](backend/docs/db.md#seed).

O seed **pode rodar várias vezes** sem duplicar nada e funciona sem internet, porque as cartas ficam em `backend/prisma/seed-data/cards.json`.

### Testar rápido no Swagger

1. Abra http://localhost:3000/docs.
2. `POST /auth/login` com `{ "email": "ash@pokebox.dev", "password": "<SEED_DEMO_PASSWORD do seu .env>" }`. Clique em **Try it out**, troque a senha do exemplo pela do seu `.env` e clique em **Execute**. Os exemplos das outras rotas também seguem o seed (o Charizard do ash, a oferta da misty); o do cadastro usa `tracey`, que não está no seed, para não dar 409.
3. Copie o `token` da resposta, clique em **Authorize** e cole. O token fica salvo até fechar a aba (um F5 não desloga).
4. Chame `GET /collection`, `GET /wishlist`, `GET /listings/me`, `GET /offers/me`, `GET /trades/me` etc. Os ids que as outras rotas pedem saem dessas listas (a descrição de cada campo diz onde pegar).
5. Para conferir o papel ADMIN, `GET /auth/admin-check`: com `admin@pokebox.dev` dá 200; com o ash, 403.

O `/docs` chama a API no mesmo endereço em que foi aberto, então funciona em qualquer porta. Rotas sem cadeado não precisam de login. No detalhe da carta com `lang=pt`, use uma carta recente (ex.: `sv03.5-025`): a TCGdex não tem o Base Set em português e responde 404.

## Testes

São dois andares da pirâmide de testes, com comandos separados:

| Tipo | Onde | O que testa | Precisa de banco |
|---|---|---|---|
| Unidade | `backend/src/**/*.test.ts` | regras puras, schemas, services e controllers, com as dependências falsas passadas no construtor | não |
| Integração | `backend/test/integration/*.int.test.ts` | requisição HTTP de verdade (supertest) passando por rota, middleware, controller, service e repository até um PostgreSQL de verdade | sim, um banco só de teste |

```bash
cd backend
npm test
```

`npm test` roda só os de unidade: é rápido e não precisa de nada no ar. `npm run typecheck` checa os tipos dos dois tipos de teste.

```bash
make test-int
```

`make test-int` cria o `backend/.env.test` a partir do `backend/.env.test.example` (se ainda não existir), sobe o banco de teste `tcg-db-test` (porta 5433, dados só em memória) e roda `npm run test:integration`. A cada execução, o banco de teste é apagado e recriado com as migrations e o seed. Por isso a suíte se recusa a rodar se o nome do banco não terminar em `_test`: o banco de desenvolvimento nunca é tocado. `make test-db-down` remove o banco de teste.

Como funcionam os testes de integração:

- Cada arquivo de teste monta o app de verdade (`buildContainer` + `createApp`) sem abrir porta, e cria os próprios usuários pelo `POST /auth/register`. Os usuários do seed entram com as senhas do `.env.test`.
- A TCGdex é simulada por um servidor local que responde com as 87 cartas de `prisma/seed-data/cards.json` no formato da TCGdex. Nenhum teste usa a internet, e dá para simular a TCGdex fora do ar (502).
- No `.env.test`, o limite de tentativas de login fica desligado (`AUTH_RATE_LIMIT=0`) e os logs ficam em silêncio (`LOG_LEVEL=silent`).
- A RN-07 tem um teste próprio (`tradeRollback.int.test.ts`): ele força um erro no meio do aceite de uma troca e confere que quantidades, reservas e status ficaram iguais.

O que a integração cobre (129 testes, um arquivo por área):

| Arquivo | Casos |
|---|---|
| `auth` | cadastro, e-mail e username repetidos (409), senha curta (400 com `details`), login certo e errado (401), sem token e token inválido (401), `admin-check` (403/200), limite de tentativas (429 com `Retry-After`, outro e-mail entra) |
| `user` | editar o perfil, campo inválido ou a mais (400), excluir a conta: login depois → 403 e perfil público → 404 |
| `collection` | adicionar e listar com `available`; RN-01 (a carta é gravada uma vez só); RN-02 (403 e 404); RN-03 (soma, quantidade negativa 400 e CHECK no banco); variante que a carta não tem (422); quantidade abaixo do anunciado (422) e apagar item anunciado (409); condição presa (409); RN-11 nos três caminhos |
| `wishlist` | adicionar, listar, remover; repetida (409); `opportunities` conta só item público de outra pessoa; RN-12 (tem a carta, mesmo privada → 409; item zerado → 201) |
| `profile` | RN-10: item privado, e-mail e reserva não aparecem; usuário inexistente (404) |
| `listings` | RN-05 (403, 422, soma dos anúncios abertos); pausar, fechar sem volta, bloqueio só do ADMIN; marketplace: `q`, `type`, `rarity`, filtros somados, `sort=name`, valor inválido (400 com `details`), `GET /listings/me` |
| `offers` | RN-06: próprio anúncio (422), anúncio pausado (404), carta de outra pessoa (403), mais do que tem (422), segunda oferta (409), quem aceita e quem cancela (403), oferta finalizada não muda (422), aceita sem troca pode ser cancelada, fechar o anúncio cancela as ofertas; quem vê a oferta; carta em oferta não é apagada (409) |
| `trades` | quem cria a troca (403), oferta não aceita (422), segunda troca (409); RN-08 (reserva dos dois lados, anúncio fecha, quantidade abaixo do reservado 422, apagar 409); RN-07 (as cartas trocam de dono) com RN-11 (a carta recebida sai da wishlist); troca finalizada não muda (409); recusar libera a reserva; cancelar; quem vê a troca (inclusive ADMIN → 403) |
| `catalog` | catálogo local da busca (#78): com a tabela vazia a busca vai à TCGdex e não tolera erro de digitação; com a tabela preenchida pelas cartas do seed: `charzard` acha o Charizard sem chamar a TCGdex, `charizard base` põe o do Base Set primeiro, `pikachu` em duas páginas sem repetir, `flabebe` acha a Flabébé, palavras ignoradas, só o nome do set, filtro `set`, `sort=name&order=desc`, TCGdex fora do ar; salvar de novo não duplica |
| `cards` | busca, busca esperta (`charizard base`, palavras ignoradas), ids recusados fora da lista, `limit` acima de 100 (400), detalhe com e sem login, carta inexistente (404), id fora da regra (400); filtros: `GET /cards/filters` (e 502 com a TCGdex fora), TCGdex instável (#145: 503 uma vez responde 200; 503 três vezes → 502 depois de 3 chamadas), `type` sem nome, mesmo nome com tipos diferentes (cache separado), nome + raridade + set, `category` com `sort=name&order=desc` e duas páginas, valor que não existe (400 com `details`) |
| `pagination` | #77: sem parâmetro responde como antes; `limit`/`page` sem repetir item; `q`, `isPublic`, `type`, `finish`, `sort=recent`; `limit=500` (400 com `details`); wishlist `type=Fire` da misty; perfil público com `limit=1` sem itens privados; ofertas e trocas com `side` e sem `side`; `page`/`limit` sem `side` (400); `GET /listings/me` paginado |
| `snapshot` | RN-09: com a TCGdex fora do ar, coleção, wishlist, perfil público e marketplace continuam respondendo com os dados da carta; o detalhe de uma carta já consultada sai da cópia guardada no banco |
| `health` e `errors` | `/health/ready`, TCGdex fora do ar (502), JSON malformado (400), corpo acima de 100 KB (413), rota inexistente (404), id que não é UUID (400), `x-request-id` |

O 504 (TCGdex demorando mais de 8 s) fica só nos testes de unidade do `TcgdexClient`, para a suíte não esperar 8 s. Como a IA ajudou a escrever esses testes, e o que ela errou, está em [`docs/ia.md`](docs/ia.md).

### Cobertura

Cobertura é a porcentagem do código que os testes executaram pelo menos uma vez. Ela não prova que o código está certo, mas mostra onde nenhum teste passa.

```bash
make coverage
```

`make coverage` sobe o banco de teste e roda `npm run test:coverage`: os testes de unidade e os de integração numa execução só, somando a cobertura dos dois. O relatório, arquivo por arquivo e linha por linha, fica em `backend/coverage/lcov-report/index.html`.

Entram na conta os arquivos `.ts` de `backend/src`. Ficam de fora os testes, o client gerado do Prisma, o Swagger escrito à mão (`src/docs`), os mocks, os arquivos só de tipos e o `server.ts`, que só sobe o servidor.

| Métrica | Só unidade | Unidade + integração | Mínimo exigido |
|---|---|---|---|
| Linhas | 86,1% | 97,8% | 95% |
| Comandos | 85,0% | 96,3% | 94% |
| Funções | 75,7% | 97,5% | 95% |
| Ramos (if/else) | 79,1% | 88,1% | 86% |

Números de 15/11/2026, medidos na CI, com 682 testes de unidade e 95 de integração. O mínimo é o valor medido menos uns 2 pontos, para uma mudança pequena não quebrar a CI. Abaixo dele, o `npm run test:coverage` termina com erro, a CI fica vermelha e o deploy não sai. A meta é manter os números e subir o mínimo dos ramos aos poucos; 100% não é meta, porque incentiva teste que só pinta linha. O front ainda não tem testes nem cobertura: isso entra com a #107.

A CI (GitHub Actions, `.github/workflows/ci.yml`) roda em toda PR para `develop` e `main` e em todo push na `develop`:

| Job | O que roda |
|---|---|
| `backend` | sobe um PostgreSQL de teste; `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm run build` e `npm run test:coverage` (unidade + integração, com o mínimo de cobertura). Mostra a tabela de cobertura no resumo da execução e guarda o relatório completo como artefato `coverage-backend` |
| `frontend` | `npm ci`, `npm run lint`, `npm run build` |

Os dois precisam passar para mergear. Na `main`, quem chama a CI é o workflow de deploy, antes de publicar (veja [Deploy](#deploy)).

## Deploy

| Peça | Onde | Como chega lá |
|---|---|---|
| Banco PostgreSQL | Neon | as migrations rodam sozinhas quando a API sobe; o seed roda uma vez, à mão; o catálogo da busca roda uma vez à mão depois do deploy e toda semana pelo GitHub Actions |
| API | Render, com o Dockerfile de `backend/` (estágio `prod`) | o pipeline chama o deploy hook do Render |
| Front | Vercel, pasta `frontend/` | o pipeline publica com a CLI da Vercel |

O app está no ar:

- Site: https://poke-box-gt.vercel.app
- API: https://pokebox-api.onrender.com (Swagger em [`/docs`](https://pokebox-api.onrender.com/docs))

Para entrar, use os usuários do seed; a senha de demonstração é passada a quem for avaliar fora do GitHub.

O caminho de uma mudança até a produção:

```
PR para a develop  ->  CI (testes)  ->  merge
release develop -> main  ->  Deploy: CI de novo  ->  API no Render  ->  front na Vercel
```

O workflow `.github/workflows/deploy.yml` roda a cada push na `main` e também pode ser disparado à mão na aba Actions. Se algum teste falhar, nada é publicado. Ele só publica o front depois que o `/health` da API responde com o commit novo (`data.version`), para o front nunca chegar antes da API de que precisa.

Configuração de produção no código:

- `backend/Dockerfile` tem dois estágios. O `dev` instala tudo e compila; o `prod` copia só o resultado e as dependências de produção, roda como `node` e tem `HEALTHCHECK`. O Render usa o último, o `prod`.
- `frontend/Dockerfile` tem o estágio `dev` (Vite), o `build` (gera `dist/`) e o `prod` (nginx com `frontend/nginx.conf`). A Vercel não usa Docker; o nginx serve para o modo produção local.
- `frontend/vercel.json` manda qualquer caminho para o `index.html`, para o F5 em `/colecao` não dar 404, e desliga o deploy automático da Vercel na `main`, que passa a ser feito pelo pipeline.
- A API aceita chamadas do navegador só dos sites em `CORS_ORIGIN` ou dos que batem com `CORS_ORIGIN_REGEX` (os previews da Vercel).

Catálogo da busca em produção (#78):

- Uma vez, depois do deploy que traz a tabela `CatalogCard`, da sua máquina: `cd backend && DATABASE_URL="<URL do Neon>" npm run catalog:sync`. Para trazer o português (#157) sem refazer o inglês: `npm run catalog:sync -- pt`. Como o seed, o script não roda dentro da imagem de produção, que não tem o `tsx`.
- Depois, o workflow `.github/workflows/catalog-sync.yml` roda o mesmo script toda segunda às 06:00 UTC (e à mão, em Actions > Catalog sync > Run workflow, escolhendo a `main`). Ele usa o secret `DATABASE_URL` do environment `production`, com a URL do Neon. Sets novos saem poucas vezes por ano, então uma vez por semana basta; se o GitHub atrasar ou pular um agendamento, nada quebra, a busca só demora mais para ver o set novo.

## Logs e saúde da API

A API registra uma linha por requisição com o [pino](https://getpino.io): método, rota, status, tempo de resposta (`responseTime`, em ms) e um id da requisição (`reqId`). Um erro de servidor (5xx) sai nessa mesma linha, com o stack. Senha, token e o header `Authorization` aparecem como `[oculto]`.

| Onde | Formato | Como ver |
|---|---|---|
| `npm run dev` ou `docker compose up` | colorido, uma linha por evento | o próprio terminal, ou `docker compose logs -f tcg-backend` |
| Produção (Render) e `make prod-up` | JSON, uma linha por evento | aba *Logs* do serviço no Render, ou `make prod-logs` |

`LOG_LEVEL` muda o quanto aparece (`debug` mostra mais, `warn` só avisos e erros). Nos testes o padrão é `silent`.

Toda resposta traz o header `x-request-id`, e o front consegue lê-lo (está liberado no CORS). Se quem chama já manda esse header, a API usa o mesmo id; senão, gera um.

**Como investigar um erro em produção:**

1. A pessoa conta o que fez e, se der, o `x-request-id` da resposta (na aba Network do navegador).
2. No Render, aba *Logs*, busque o id (`3f2a...`) e veja tudo o que aconteceu naquela requisição, inclusive o stack do erro.
3. Sem o id, busque `"statusCode":500` para ver os erros de servidor, ou ordene pelo `responseTime` para achar as rotas lentas.

Duas rotas dizem se a API está bem:

| Rota | Confere | Quem usa |
|---|---|---|
| `GET /health` | o processo está de pé (não toca no banco); devolve o commit em `version` | Health Check do Render e o pipeline de deploy |
| `GET /health/ready` | o banco responde (`SELECT 1`); 503 se não | para conferir à mão ou num monitor externo |

As duas ficam fora do log automático, porque o Render e o pipeline chamam o tempo todo. O preflight do CORS (`OPTIONS`, que o navegador manda antes de cada `POST`) também fica fora.

## Traces

Um trace é a linha do tempo de uma requisição: quanto tempo ela passou no Express, em cada consulta ao banco e na chamada à TCGdex. O log diz *que* uma rota demorou; o trace diz *onde*. A API usa o [OpenTelemetry](https://opentelemetry.io), o padrão aberto: o mesmo código manda os traces para o Jaeger local ou para qualquer serviço compatível, trocando só variáveis de ambiente.

```bash
make traces
```

`make traces` sobe o [Jaeger](https://www.jaegertracing.io) (perfil `observabilidade` do compose) e a API em modo watch mandando os traces para ele. A tela fica em http://localhost:16686: escolha o serviço `pokebox-backend` e a operação.

| O que aparece | De onde vem |
|---|---|
| a requisição (`POST /trades/:id/accept`) e o handler da rota | instrumentação de HTTP e do Express |
| cada operação do Prisma e cada SQL, com o texto da consulta | `@prisma/instrumentation` e instrumentação do `pg` |
| a chamada à TCGdex (`GET`) | instrumentação do `fetch` (undici) |
| `trade.accept`, em volta do aceite da troca | span manual (`withSpan`, em `src/lib/tracing.ts`) |

Como funciona:

- `src/instrumentation.ts` liga o OpenTelemetry e precisa carregar **antes** do Express e do `pg`, para conseguir "embrulhar" essas bibliotecas. Por isso ele entra com `node --import` (no `npm run dev`, no `npm start` e no `CMD` do Dockerfile), e não por um `import` no `server.ts`.
- Sem `OTEL_EXPORTER_OTLP_ENDPOINT`, nada liga: os testes e quem não quer traces não são afetados.
- O `/health` não gera trace (o monitor chama a cada 5 minutos), e os spans de middleware ficaram de fora para o trace mostrar só o que importa.
- Com os traces ligados, cada linha de log ganha `trace_id` e `span_id`. Achou um erro no log? Copie o `trace_id` e cole na busca do Jaeger para ver a requisição inteira.

**Roteiro para a apresentação:** com `make traces`, `misty` cria uma troca e `ash` aceita. No Jaeger, a operação `trade.accept` mostra a transação (`BEGIN` ... `COMMIT`), as travas `SELECT ... FOR UPDATE` da RN-08 em ordem e o tempo de cada consulta. Depois, abra um `GET /cards/:id` de uma carta nunca vista (span da TCGdex, centenas de ms) e o mesmo id de novo (sai do cache em memória, sem span da TCGdex).

Na mão, sem o `make`: com o Jaeger de pé, rode a API com `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` (ou `http://jaeger:4318` com o backend no compose). Os traces vão em protobuf por HTTP (OTLP), formato que o Jaeger e o Grafana aceitam.

### Traces da produção (Grafana Cloud)

A API no Render manda os traces para o Grafana Cloud (plano gratuito, retenção curta). Para ver: no Grafana, **Explore**, fonte **Tempo**, e busque `{resource.service.name="pokebox-backend"}`, ou cole um `trace_id` copiado dos logs do Render.

Configuração:

1. No Grafana Cloud, **Connections → OpenTelemetry (OTLP)**: gera o endpoint e um token.
2. No Render, serviço da API, **Environment**:

| Variável | Valor |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | o endpoint do Grafana (`https://otlp-gateway-prod-<região>.grafana.net/otlp`) |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic <token>`. É segredo: só no painel do Render, nunca no Git |
| `OTEL_SERVICE_NAME` | `pokebox-backend` |

Sem essas variáveis, a API roda sem traces. Os traces saem em lotes a cada poucos segundos e, ao desligar, a API espera o último lote ser enviado.

## Performance e segurança

### O que já existia

- Cache das cartas da TCGdex em camadas (padrão Decorator, em `backend/src/cards/catalog/`): memória (1 h, até 500 cartas), depois junção de pedidos iguais em andamento, depois a tabela `CardCache` no banco (24 h, usada também quando a TCGdex cai), e só então a chamada HTTP.
- Cache em memória da busca de cartas (10 min) e da lista de sets (1 dia), e timeout de 8 s nas chamadas à TCGdex.
- A TCGdex falha por alguns segundos com frequência (#145). Quando ela responde 502, 503 ou 504, ou a conexão cai, a API tenta de novo até 2 vezes (espera de 200 ms e 600 ms, sem passar dos 8 s do timeout); 404, outros erros e timeout não são repetidos. Cada nova tentativa aparece no log (`warn`) e como span próprio nos traces. Se mesmo assim ela não responder, a busca, a lista de sets, os filtros e as cartas de um set usam o último resultado guardado em memória, mesmo vencido.
- `Cache-Control` nas cartas: a lista é `public, max-age=300`; o detalhe é `private`, porque traz os anúncios da carta e, com login, os dados da pessoa.
- Paginação, busca e filtros no `GET /listings`.

### O que a #112 acrescentou

| O quê | Por quê |
|---|---|
| Compressão gzip (`compression`) | listas de cartas em JSON encolhem até 87% (tabela abaixo). Faz diferença no celular e na rede entre o Render e o navegador |
| Cabeçalhos de segurança (`helmet`) | `X-Content-Type-Options`, `Strict-Transport-Security`, política de conteúdo e outros; tira o `X-Powered-By: Express`. O Swagger em `/docs` continua funcionando |
| Limite de tentativas no login e no cadastro (`express-rate-limit`) | 20 tentativas **sem sucesso** para o mesmo e-mail a partir do mesmo IP, a cada 15 minutos, contadas à parte em cada rota. Depois disso, 429 com `Retry-After` |
| `trust proxy` em produção | no Render a API fica atrás de um proxy; sem isso, todo mundo pareceria ter o mesmo IP |
| `express.json({ limit: '100kb' })` | o limite já existia (padrão do Express), agora está escrito; acima dele, 413 |
| Índice `(status, createdAt DESC, id)` em `Listing` | o `GET /listings` lê os anúncios ativos já na ordem e para no fim da página |

Sobre o limite de tentativas:
- Conta só o que falha, e por IP **e** e-mail. Na apresentação, a turma inteira entra do mesmo wi-fi, ou seja, do mesmo IP. Se o limite fosse só por IP, 20 senhas erradas de pessoas diferentes travariam o login de todo mundo. Assim, quem erra a própria senha bloqueia só a própria conta, e quem tenta adivinhar a senha de alguém para em 20 tentativas.
- Depois do bloqueio, nem a senha certa entra naquele e-mail, a partir daquele IP, até a janela acabar: é o que impede a força bruta.
- Login e cadastro têm contadores separados: errar o cadastro não bloqueia o login.
- `AUTH_RATE_LIMIT` muda o número (padrão 20; `0` desliga).
- Risco que fica: a mesma senha testada em muitos e-mails diferentes não é barrada, porque cada e-mail tem o próprio contador. É o preço de não travar a sala inteira. O próximo passo seria um segundo limite só por IP, bem mais alto (por exemplo, 200 falhas em 15 minutos).
- O `trust proxy` confia em exatamente um proxy na frente da API, que é o caso do Render. Com outro proxy no meio (uma Cloudflare, por exemplo), a API passaria a enxergar o IP do proxy. Isso não abre brecha, porque a chave inclui o e-mail, mas precisa ser conferido com o app no ar (#60).

### Medição antes e depois

Máquina: Apple M4 Pro (12 núcleos), Node 24, Postgres 17 no Docker. API em modo produção (`NODE_ENV=production`, `LOG_LEVEL=warn`), aquecida com uma chamada antes de cada rota. Cada linha: `npx autocannon -c 20 -d 15 <url>` (20 conexões ao mesmo tempo, por 15 segundos). Latência média, p99 (99% das requisições ficam abaixo dele) e requisições por segundo.

**Com o banco do seed (10 cartas, poucos anúncios):**

| Rota | Antes | Depois |
|---|---|---|
| `GET /cards?name=pikachu` | 0,06 ms · p99 1 ms · 32.397 req/s | 0,09 ms · p99 1 ms · 27.515 req/s |
| `GET /cards/base1-4` | 3,15 ms · p99 5 ms · 5.621 req/s | 3,18 ms · p99 5 ms · 5.510 req/s |
| `GET /listings` | 3,23 ms · p99 6 ms · 5.411 req/s | 3,29 ms · p99 5 ms · 5.252 req/s |
| `GET /collection` (com login) | 4,28 ms · p99 7 ms · 4.235 req/s | 4,47 ms · p99 7 ms · 4.051 req/s |
| `GET /cards?name=pikachu&limit=100` pedindo gzip | 1,06 ms · p99 2 ms · 15.794 req/s | 1,22 ms · p99 3 ms · 11.120 req/s |

**Tamanho da resposta** (`curl -s -o /dev/null -w "%{size_download}" -H "Accept-Encoding: gzip" <url>`):

| Rota | Antes | Depois |
|---|---|---|
| `GET /cards?name=pikachu&limit=100` | 22.617 bytes | 2.828 bytes (−87%) |
| `GET /collection` do `ash` | 5.687 bytes | 1.254 bytes (−78%) |
| `GET /listings` | 2.075 bytes | 844 bytes (−59%) |

**Com 100 mil anúncios (20 mil ativos)**, gerados por `backend/scripts/bench-listings.sql` num banco de teste:

| Medida | Sem o índice novo | Com o índice novo |
|---|---|---|
| `GET /listings` (autocannon) | 23,79 ms · p99 42 ms · 823 req/s | 9,04 ms · p99 15 ms · 2.096 req/s |
| Consulta da primeira página (`EXPLAIN ANALYZE`) | 6,3 ms: lê os 20 mil ativos, ordena todos e pega 21 | 0,3 ms: lê 21 linhas do índice, já na ordem |

O log de SQL do Postgres estava ligado nas duas rodadas dessa última tabela, o que aumenta um pouco os números absolutos; a comparação vale porque as duas tiveram a mesma condição.

**Como ler esses números:**
- O índice é o ganho de verdade: 2,5 vezes mais requisições por segundo no `GET /listings` com volume de app em uso. A tabela do seed foi medida sem ele: com tão poucas linhas, o Postgres nem usaria o índice.
- A compressão encolhe muito as respostas, mas custa CPU. Na mesma máquina, sem rede no meio, isso aparece como menos requisições por segundo na lista grande (de 15.794 para 11.120). Pela internet o gargalo é a rede, e mandar 2,8 KB em vez de 22,6 KB compensa. Na escala do projeto, as duas folgas sobram.
- O helmet e a compressão custam de 2% a 15% de vazão nas rotas rápidas, diferença de microssegundos por requisição. É o preço dos cabeçalhos de segurança, e vale.

### Busca no catálogo local (#78)

A busca por nome passou a rodar no Postgres, numa tabela com o resumo das ~24 mil cartas, com as extensões `pg_trgm` (semelhança entre textos por trigramas, pedaços de 3 letras) e `unaccent` (tira acento). Trigrama no lugar do full-text search do Postgres (`tsvector`): o full-text é bom para frases e idiomas, mas não perdoa erro de digitação em nomes curtos como os das cartas. E no lugar de Elasticsearch ou Algolia: roda no banco que já temos, sem serviço novo, e funciona no plano grátis do Neon.

Medido com `EXPLAIN ANALYZE` no banco local com o catálogo inteiro (23.912 cartas):

| Consulta | Com o índice GIN | Sem índice |
|---|---|---|
| `charzard`, primeira página | 1,5 ms | 33,4 ms |
| `pikachu`, segunda página | 2,0 ms | 26,7 ms |
| a palavra `pipi` acha alguma carta? | 0,1 ms | 22,7 ms |

Pela API, na máquina local: `GET /cards?name=charizard base` responde em 5 a 10 ms. A mesma busca de `pikachu` em `lang=pt`, que ainda vai à TCGdex, levou 2 s na primeira chamada (depois fica 10 min em memória). Detalhes do índice em [`backend/docs/db.md`](backend/docs/db.md#índice-de-trigramas-da-busca-78).

### Decisões que ficaram como estão

- **O `requireAuth` consulta o banco a cada requisição.** Medido: o `GET /auth/admin-check` (JWT mais a busca do usuário pela chave) responde em 1,36 ms de média, contra 0,02 ms do `/health`. Confiar só no JWT economizaria essa consulta, mas uma conta desativada ou suspensa continuaria entrando até o token vencer (1 dia). Mantido: 1,3 ms é pouco para perder o bloqueio imediato.
- **O cache em memória some quando o Render dorme ou reinicia.** O cache no banco (`CardCache`) segura, e a TCGdex não é chamada de novo à toa. Com mais de uma instância, cada uma teria a própria memória; o próximo passo seria um Redis.
- **Loops com `await` dentro das transações de troca e oferta** (`TradeService`, `OfferService`, `lockInOrder` no `PrismaCollectionRepository`). São em sequência de propósito: as travas em ordem evitam deadlock (RN-08), e o tamanho é o número de cartas de uma troca. Não paralelizar.
- **Páginas muito fundas no `GET /listings`** ainda custam: com `OFFSET 1000`, a consulta leva 5,5 ms, porque o banco percorre as 1.000 linhas antes. Paginação por cursor resolveria; não vale agora.
- **Coleção, wishlist, ofertas e trocas:** paginação opcional desde a #77 (sem parâmetro, ainda devolvem a lista inteira, para o front migrar aos poucos na #147).

### Como repetir

```bash
cd backend && npm run build
NODE_ENV=production LOG_LEVEL=warn npm start
npx autocannon -c 20 -d 15 "http://localhost:3000/listings"
```

Para o teste com volume, crie antes um banco **separado**. O script cria 5 mil usuários e 100 mil anúncios, e não há jeito fácil de desfazer num banco que você usa no dia a dia:

```bash
docker compose exec tcg-db createdb -U <user> pokebox_bench
cd backend
export DATABASE_URL="postgresql://<user>:<senha>@localhost:5432/pokebox_bench" PRISMA_DATABASE_URL="$DATABASE_URL"
npx prisma migrate deploy && npx prisma db seed
docker compose exec -T tcg-db psql -U <user> -d pokebox_bench < scripts/bench-listings.sql
NODE_ENV=production LOG_LEVEL=warn npm start
```

Para apagar depois: `docker compose exec tcg-db dropdb -U <user> pokebox_bench`.

## API

Para entender o fluxo do app (coleção, wishlist, anúncio, oferta e troca) antes dos detalhes, leia o [guia do backend](backend/docs/guia-backend.md) (também em [PDF](backend/docs/guia-backend.pdf)).

Todas as respostas seguem o mesmo formato:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "mensagem", "details": [{ "field": "quantity", "message": "..." }] }
```

`details` só aparece em erro de validação (400). Rotas com 🔒 exigem `Authorization: Bearer <token>`; com 🔓 o token é opcional (muda o que a pessoa enxerga).

**Paginação opcional nas listas (#77).** `GET /collection`, `GET /wishlist`, `GET /users/:username/collection`, `GET /listings/me`, `GET /offers/me` e `GET /trades/me` respondem como sempre quando não recebem nenhum parâmetro novo: a lista inteira, no mesmo formato. Qualquer parâmetro novo (`page`, `limit`, um filtro, `sort` ou `side`) liga a paginação, mesmo sem `page` (aí vem a página 1). A resposta paginada é igual à do `GET /listings`: `{ "success": true, "data": { "items": [] }, "pagination": { "page": 1, "limit": 20, "hasNextPage": false } }`, sem total. `limit` padrão 20, máximo 100 (acima disso → **400** com `details`). Sem `sort`, a ordem é a de antes; o `id` desempata para nenhum item repetir ou sumir entre as páginas.

### Autenticação e conta

| Rota | | O que faz |
|---|---|---|
| `POST /auth/register` | | cria conta (`username`, `name`, `email`, `password`) e devolve o token |
| `POST /auth/login` | | login com e-mail e senha, devolve o token |
| `GET /auth/me` | 🔒 | dados do usuário logado |
| `GET /auth/admin-check` | 🔒 ADMIN | testa o acesso de admin |
| `PATCH /user/me` | 🔒 | edita nome, telefone e endereço |
| `DELETE /user/me` | 🔒 | desativa a conta (soft delete) |

### Cartas (catálogo)

| Rota | | O que faz |
|---|---|---|
| `GET /cards?name=&page=&limit=&lang=&type=&rarity=&set=&category=&sort=&order=` | | busca cartas, com paginação. Entende nome de set e ignora palavras que não acham nada: `charizard base` traz os Charizard com o do Base Set primeiro, e `charizard base x pipi popo` ainda traz os Charizard. O resultado vem ordenado por relevância, cada carta traz `set: { id, name }` e `number`, e a resposta traz `search: { name, sets, ignored }` dizendo como a busca foi entendida. **Catálogo local (#78):** com o catálogo sincronizado (`npm run catalog:sync`), a busca por nome roda no nosso banco, sem chamar a TCGdex: tolera erro de digitação (`charzard`, `pikachuu`), ignora acento (`flabebe` acha `Flabébé`) e continua funcionando com a TCGdex fora do ar. Palavra curta pode achar um nome parecido (`popo` acha `Po Town`) em vez de ir para `ignored`. Sem nome, com filtro de `type`, `rarity` ou `category`, ou num idioma ainda não sincronizado (hoje `en` e `pt` são), a busca vai à TCGdex como antes. Cartas com id que o detalhe não aceita (fora de letras, números, ponto e hífen) ficam fora da lista: hoje são só as Unown "!" e "?" do set `exu`; por isso uma página pode vir com uma carta a menos. **Filtros (#75):** `type`, `rarity`, `set` (id do set) e `category` filtram pelo valor exato, com ou sem nome; a caixa não importa (`fire` vira `Fire`), e valor que não existe no idioma responde 400 com `details`. `sort=name` com `order=asc` ou `desc` ordena pelo nome no lugar da relevância |
| `GET /cards/filters?lang=` | | opções dos filtros do catálogo no idioma pedido: `{ types, rarities, categories, sets: [{ id, name }] }`. Os valores vêm traduzidos pela TCGdex (em `pt`, `Fire` vira `Fogo`). Fica 1 dia em memória; com a TCGdex fora do ar usa a última lista guardada, e sem nenhuma guardada → 502 |
| `GET /cards/:id` | 🔓 | detalhe da carta (ataques, variantes, preço de referência) e os anúncios ativos dela; com login, traz `user` (quantas você tem, se está na sua wishlist, se você tem anúncio ativo dela) |

### Coleção

| Rota | | O que faz |
|---|---|---|
| `GET /collection?q=&condition=&finish=&isPublic=&setId=&type=&sort=&page=&limit=` | 🔒 | minha coleção, com `available` (quantidade menos reservada), pelo nome da carta. `q` busca por palavras no nome da carta ou do set; `isPublic=false` traz só os privados; `sort` é `name` (padrão) ou `recent` (entrada mais nova primeiro). Paginação opcional |
| `POST /collection` | 🔒 | adiciona carta: `cardId`, `quantity`, `finish`, `firstEdition`, `condition?`, `isPublic?`. Se a carta estava na sua wishlist, ela sai (RN-11) e a resposta traz `removedFromWishlist: true` |
| `PATCH /collection/:id` | 🔒 | muda `quantity`, `condition` ou `isPublic`. A condição não muda enquanto o item está num anúncio aberto, numa oferta aberta ou aceita ou numa troca aberta (**409**) |
| `DELETE /collection/:id` | 🔒 | remove o item (não remove se tiver reserva ou se já foi anunciado; nesse caso, zere a quantidade) |
| `GET /users/:username/collection?q=&type=&page=&limit=` | | coleção pública de um colecionador (itens privados nunca aparecem, RN-10). Paginada, a resposta mantém `data: { user, items }` |

### Wishlist

| Rota | | O que faz |
|---|---|---|
| `GET /wishlist?q=&type=&rarity=&sort=&page=&limit=` | 🔒 | minha wishlist, com `opportunities` em cada carta (paginada, calculado só para os itens da página). Paginação opcional |
| `POST /wishlist` | 🔒 | adiciona carta (`cardId`). Carta que você já tem na coleção → **409** (RN-12) |
| `DELETE /wishlist/:id` | 🔒 | remove |

### Anúncios de troca

| Rota | | O que faz |
|---|---|---|
| `GET /listings?q=&cardId=&username=&condition=&finish=&firstEdition=&setId=&type=&rarity=&sort=&page=&limit=` | | anúncios ativos, com `hasNextPage`. `q` busca por palavras no nome da carta ou do set (`charizard base` acha o Charizard do Base Set). Os filtros se somam e não diferenciam maiúscula (`type=fire`, `rarity=rare`, `condition=near_mint`); `sort` é `recent` (padrão), `oldest` ou `name`. Valor inválido → **400** com `details` |
| `GET /listings/me?page=&limit=` | 🔒 | meus anúncios, em qualquer status, mais novos primeiro. Paginação opcional |
| `GET /listings/:id` | 🔓 | detalhe; anúncio pausado, fechado ou bloqueado só aparece para o dono e para o ADMIN |
| `POST /listings` | 🔒 | anuncia um item da minha coleção: `collectionItemId`, `quantity`, `description?` |
| `PATCH /listings/:id` | 🔒 | muda `quantity`, `description` ou `status` (`ACTIVE`, `PAUSED`, `CLOSED`); ADMIN só bloqueia (`BLOCKED`) ou desbloqueia. Fechar ou bloquear cancela as ofertas abertas e as aceitas que ainda não viraram troca; diminuir cancela as aceitas que pedem mais do que a nova quantidade |

### Ofertas de troca

| Rota | | O que faz |
|---|---|---|
| `POST /listings/:id/offers` | 🔒 | faz uma oferta num anúncio: `quantity` (quantas cartas do anúncio quero), `message?` e `items` (de 1 a 20 cartas da minha coleção, cada uma com `collectionItemId` e `quantity`) |
| `GET /offers/me?status=&side=&page=&limit=` | 🔒 | minhas ofertas: `sent` (que fiz) e `received` (nos meus anúncios), mais novas primeiro. Com `side=sent` ou `side=received`, vem só aquele lado em `{ items }` paginado; `page`/`limit` sem `side` → **400**. `status` sozinho não pagina |
| `GET /offers/:id` | 🔒 | detalhe; só quem fez a oferta e o dono do anúncio veem (outros → 404) |
| `PATCH /offers/:id/status` | 🔒 | `{ status }`: o dono do anúncio aceita (`ACCEPTED`) ou recusa (`REJECTED`); quem fez a oferta cancela (`CANCELED`). Oferta aceita que ainda não virou troca também pode ser recusada ou cancelada |

### Trocas

A troca é um aperto de mão em dois passos: o dono do anúncio aceita a oferta → **quem fez a oferta** cria a troca (as cartas dos dois lados ficam reservadas) → o **dono do anúncio** conclui e as cartas mudam de dono.

| Rota | | O que faz |
|---|---|---|
| `POST /trades` | 🔒 | `{ offerId }`: quem fez a oferta cria a troca a partir da oferta aceita. Reserva as cartas e ajusta os anúncios |
| `GET /trades/me?status=&side=&page=&limit=` | 🔒 | minhas trocas: `sent` (fiz a oferta) e `received` (meus anúncios), mais novas primeiro. `side` funciona como em `GET /offers/me` |
| `GET /trades/:id` | 🔒 | detalhe; só as duas partes veem (outros, inclusive ADMIN → 403) |
| `POST /trades/:id/accept` | 🔒 | o dono do anúncio conclui: as cartas trocam de dono, tudo ou nada |
| `POST /trades/:id/reject` | 🔒 | o dono do anúncio recusa; a reserva é liberada |
| `POST /trades/:id/cancel` | 🔒 | quem fez a oferta cancela; a reserva é liberada |

A documentação completa, com exemplos de corpo e resposta, está no **Swagger (`/docs`)**.

### Códigos de status

| Código | Quando |
|---|---|
| 400 | dados inválidos (campo faltando, formato errado, campo a mais) ou JSON inválido no corpo (`"JSON inválido"`) |
| 401 | sem token, token inválido ou expirado, senha errada |
| 403 | logado, mas sem permissão (item de outra pessoa, rota de admin, conta suspensa) |
| 404 | não encontrado (inclui perfil de conta desativada) |
| 409 | conflito (e-mail/username já usados, carta repetida na wishlist, apagar item com reserva, que já foi anunciado ou que está numa oferta, segunda oferta aberta no mesmo anúncio, oferta que já virou troca, troca já finalizada) |
| 422 | regra de negócio violada (ex.: quantidade abaixo da reservada ou anunciada, anunciar mais do que tem, variante que a carta não tem, oferta no próprio anúncio, mudar oferta já finalizada, troca de oferta não aceita, cartas da troca indisponíveis) |
| 413 | corpo da requisição acima do limite (100 KB) |
| 429 | muitas tentativas de login ou cadastro sem sucesso para o mesmo e-mail (20 em 15 minutos); o header `Retry-After` diz quantos segundos esperar |
| 500 | erro inesperado (o stack vai para o log com o `x-request-id`) |
| 502 | serviço de cartas (TCGdex) fora do ar, sem conexão ou respondendo errado, e sem cópia da carta guardada: "tente novamente em instantes" |
| 503 | `GET /health/ready` com o banco fora do ar |
| 504 | serviço de cartas (TCGdex) demorou mais de 8 s para responder, e sem cópia da carta guardada |

## Regras de negócio

### Implementadas na develop

| Regra | Como funciona |
|---|---|
| **RN-01** Catálogo × coleção | Ao adicionar uma carta à coleção ou à wishlist, os dados dela são buscados na TCGdex e gravados **uma vez** na tabela `Card`. A coleção só aponta para essa carta, nunca duplica. |
| **RN-02** Dono do item | Só o dono vê, edita ou apaga os próprios itens. Mexer no item de outra pessoa → **403**, inclusive para ADMIN. Item que não existe → **404**. |
| **RN-03** Quantidade | Quantidade nunca negativa (validação + CHECK no banco). Mesma carta com mesma condição e variante **soma** na quantidade em vez de criar outro item. Não pode baixar a quantidade abaixo do que está reservado em negociação (**422**) nem apagar item com reserva (**409**). |
| **RN-04** Wishlist | Cada carta entra uma vez na wishlist (repetida → **409**). Cada item mostra `opportunities`: quantos **outros** colecionadores têm essa carta pública e disponível (contas desativadas não contam). A wishlist não tem variante: quem deseja aceita qualquer versão. |
| **RN-05** Anúncios (adaptada: só trocas) | Só anuncia item da **própria** coleção (**403**). A soma das quantidades dos anúncios abertos (ativos e pausados) de um item não passa do disponível (quantidade menos reservada); senão **422**. Vale ao criar, ao aumentar a quantidade e ao desbloquear. A coleção também não deixa baixar a quantidade abaixo do que está anunciado (**422**). Anunciar **não reserva**: a reserva fica para a troca (RN-07/08). Pedidos ao mesmo tempo no mesmo item são tratados um de cada vez (trava no banco). |
| **RN-06** Ofertas | Só faz oferta em anúncio **ativo** de outra pessoa (próprio anúncio → **422**; pausado, fechado ou bloqueado → **404**). Pede no máximo a quantidade do anúncio e oferece só cartas da **própria** coleção (**403**) que caibam no disponível (**422**). Uma oferta aberta por pessoa em cada anúncio (**409**). Só o **dono do anúncio** aceita ou recusa; só **quem fez** cancela (**403**, inclusive para ADMIN). Oferta finalizada (aceita, recusada ou cancelada) **não muda mais** nem volta para `PROPOSED` (**422**), com uma exceção: oferta **aceita que ainda não virou troca** pode ser recusada pelo dono ou cancelada por quem fez, para não ficar presa; se já virou troca, **409** e quem age é a troca. Recusar ou cancelar solta as cartas oferecidas. Fechar ou bloquear o anúncio cancela as ofertas abertas dele e as **aceitas que ainda não viraram troca** (desbloquear não traz de volta); diminuir o anúncio cancela as aceitas que pedem mais do que a nova quantidade (cada uma comparada sozinha); pausar não mexe em nenhuma. Oferta aceita que já virou troca não muda: quem manda é a troca. A oferta **não reserva** cartas, mas o aceite confere de novo: se o dono baixou o anúncio abaixo do que a oferta pede, ou se quem ofertou não tem mais as cartas, o aceite é recusado (**422**). Carta que está numa oferta aberta ou aceita não pode ser apagada da coleção (**409**). |
| **RN-07** Troca atômica | O aceite da troca roda numa **transação só**: trava as cartas, confere de novo que cada uma ainda é de quem entrega e está reservada, tira de quem entrega e soma em quem recebe (no item igual em carta, condição e variante; se não houver, cria um item público). Se qualquer passo falhar, **nada muda**. Quem entrega fica com o item, mesmo que chegue a 0. Só o dono do anúncio aceita ou recusa; só quem fez a oferta cria e cancela a troca (**403**). Troca finalizada não muda mais (**409**). Uma troca por oferta (**409**). |
| **RN-08** Reserva | Quando a troca nasce, as cartas dos dois lados ficam **reservadas**: nenhuma outra negociação consegue usá-las (anunciar, ofertar, aceitar outra oferta → **422**), nem dá para baixar a quantidade abaixo do reservado (**422**) ou apagar o item (**409**). No mesmo momento, o anúncio diminui pela quantidade da oferta (em 0, fecha e cancela as ofertas abertas dele) e os anúncios de quem ofertou que passariam do disponível são reduzidos. Outras ofertas já aceitas desse anúncio que não cabem mais são canceladas e soltam as cartas. Recusar ou cancelar a troca libera a reserva (os anúncios não voltam). Pedidos ao mesmo tempo na mesma troca: um passa, o outro recebe **409**. A **condição** de um item não muda enquanto ele está num anúncio aberto, numa oferta aberta ou aceita ou numa troca aberta (**409**): assim o que foi anunciado e oferecido é o que chega. |
| **RN-09** Snapshot local da carta | Quando uma carta entra numa coleção ou wishlist, nome, set, número, imagem, raridade, tipos e preço de referência são gravados na tabela `Card` (RN-01). Coleção, wishlist, perfil público e marketplace leem dali, sem chamar a TCGdex: com ela fora do ar, essas telas continuam funcionando. O detalhe completo (ataques, habilidades) fica guardado 24 h no `CardCache` e é usado quando a TCGdex cai (veja "Cache das cartas" abaixo). |
| **RN-10** Privacidade | Item com `isPublic: false` não aparece no perfil público. O perfil público nunca mostra e-mail, reserva nem dados internos. Conta desativada ou suspensa → **404**. |
| **RN-11** Coleção limpa a wishlist | Carta que entra na coleção sai da wishlist da pessoa, na mesma transação: vale ao adicionar (`POST /collection`), ao receber numa troca concluída (`POST /trades/:id/accept`) e quando um item zerado volta a ter quantidade (`PATCH /collection/:id`). Como a wishlist não tem variante, qualquer condição ou acabamento conta. |
| **RN-12** Wishlist só do que falta | Carta que você já tem na coleção (quantidade maior que 0, em qualquer variante, pública ou privada) não entra na wishlist (**409**). Item zerado não conta. Junto com a RN-11, a wishlist guarda só o que a pessoa ainda não tem. |

Outras regras que já valem:

- **Variante da carta:** cada item tem `finish` (`NORMAL`, `HOLO`, `REVERSE`) e `firstEdition`. Só aceita combinações que a carta realmente tem na TCGdex (senão **422**).
- **Condição:** `MINT`, `NEAR_MINT`, `EXCELLENT`, `GOOD`, `LIGHT_PLAYED`, `PLAYED` ou `POOR`.
- **Conta:** login de conta suspensa ou inativa → **403**. Excluir a conta só desativa (soft delete); o histórico fica.
- **Cache das cartas:** o detalhe de uma carta é buscado na TCGdex só na primeira vez e guardado por 24h no banco (`CardCache`) e por 1h em memória. Antes de desistir, a API tenta de novo até 2 vezes quando a TCGdex responde 502, 503 ou 504 ou a conexão falha. Se a TCGdex cair, a API usa a última cópia guardada. A busca `GET /cards` guarda o resultado em memória por 10 min e a lista de sets por 1 dia (trocar de página não chama a TCGdex de novo); depois desse prazo o resultado continua guardado e é usado se a TCGdex cair. Sem nenhuma cópia, responde **502** (fora do ar) ou **504** (demorou mais de 8 s), e o front mostra a mensagem com o botão **"Tentar de novo"** no catálogo e no detalhe da carta. O cache é gravado com o id oficial da carta, mesmo que a URL use outra caixa (`/cards/BASE1-4` grava e atualiza o preço de `base1-4`).
- **Preço de referência:** cada carta guarda o preço de mercado da TCGdex (TCGplayer em USD ou Cardmarket em EUR), atualizado quando a carta é consultada de novo. É **só informativo**.
- **Status do anúncio:** o dono alterna entre ativo e pausado e pode fechar; anúncio fechado não volta. Só o ADMIN bloqueia, e só ele desbloqueia (volta como pausado). Um item que já foi anunciado não pode mais ser apagado da coleção, porque o anúncio fica no histórico; para tirá-lo do perfil, zere a quantidade.
- **Integridade no banco:** chaves estrangeiras, uniques e CHECKs em todas as tabelas. Lista completa em [`backend/docs/db.md`](backend/docs/db.md).

### Adaptação: só trocas

O enunciado previa anúncios de venda e de troca. **O time decidiu que o PokeBox é só de trocas** (sem venda nem pagamento). Por isso:

- o anúncio não tem tipo nem preço;
- a oferta diz **quais cartas da coleção** o proponente dá em troca;
- a RN-05 vira "só anuncia o que tem disponível para troca".

### Limitações conhecidas

- No plano gratuito do Render, a API dorme depois de 15 minutos sem uso, e a primeira chamada seguinte leva cerca de 2 minutos (a imagem sobe e roda o `prisma migrate deploy` antes de atender). Para isso não acontecer durante a avaliação, um monitor externo gratuito (UptimeRobot) chama `GET /health` a cada 5 minutos e avisa por e-mail se a API cair. Antes isso era um workflow agendado no GitHub Actions, a cada 10 minutos; ele foi removido porque o GitHub atrasa e descarta agendamentos quando a fila está cheia, e na prática rodou 1 vez em 5 horas. Não custa nada: um serviço ligado o mês todo cabe nas 750 h grátis do Render (não criar outro serviço grátis na mesma conta) e o `/health` não consulta o banco, então o Neon continua dormindo. O cache de cartas em memória some quando ela dorme; o cache no banco continua.
- Em produção, nenhuma senha do seed é pública. A do `ash` e da `misty` (`SEED_DEMO_PASSWORD`) é passada a quem for avaliar fora do GitHub; a do `admin` (`SEED_ADMIN_PASSWORD`) fica só com o time. O login e o cadastro param depois de 20 tentativas sem sucesso para o mesmo e-mail em 15 minutos.

- Não há prazo de validade para oferta aceita nem para troca aberta: uma oferta aceita que nunca vira troca segura as cartas oferecidas até alguém encerrá-la à mão (o dono recusa ou quem ofertou cancela).
- Uma troca recusada ou cancelada não volta os anúncios que foram reduzidos quando ela nasceu, e a oferta não gera outra troca: é preciso fazer uma oferta nova.

## MVP do front (PR rascunho, não mergear)

A branch `feat/mvp-front` liga as telas do front a **todas** as rotas da API, sem firula, para demonstrar o app ponta a ponta e servir de referência para as telas do board (#22 a #27). Ela inclui a tela de perfil da #50 ligada à API.

```bash
cd frontend && npm install && npm run dev
```

Abra `http://localhost:5173`, entre com um usuário do seed e use o menu: Cards (catálogo), Marketplace, Coleção, Wishlist, Anúncios, Propostas, Trocas e Meu perfil. Para mostrar uma troca, use duas janelas (uma normal e uma anônima), uma com o `ash` e outra com a `misty`. Os erros aparecem com a mensagem da API e o código HTTP, por exemplo "Você já tem uma oferta aberta neste anúncio (409)".

As chamadas ficam em `frontend/src/api/` (axios com interceptores em `http.js`, uma função por rota).

As páginas (`frontend/src/pages/`) só buscam os dados e montam a tela; cada bloco visual é um componente em `frontend/src/components/<Nome>/<Nome>.jsx`. Os reaproveitados entre páginas são `CabecalhoPagina`, `Paginacao`, `CartaMini`, `MiniaturaCarta`, `AbasNegociacao` e `GradeCartas`. A home busca 12 cartas em `GET /cards` e mostra `SkeletonCard` enquanto carrega. A seção `GridCartas` da home e o catálogo (`/catalogo`) reutilizam o `GradeCartas`, que concentra a grade e seu CSS (quatro colunas na home e três no catálogo, no desktop). O `CartaCard` lê diretamente o formato da API (`image.small`, `set.name`) e o das outras telas (`imageUrl`, `setName`), sem adaptador. Em telas acima de 600px, o detalhe (`GET /cards/:id`) é buscado somente ao passar o mouse ou focar a carta; o painel de tipo, raridade, set, número e artista só aparece depois que os dados chegam. Até 600px, esse detalhe não é solicitado pela grade, pois o painel fica oculto. Os tipos em inglês e em português usam as mesmas cores, e as imagens não podem ser arrastadas.

**Catálogo e marketplace no mesmo modelo (#86, #87).** As duas telas têm o mesmo layout: cabeçalho, barra com a busca (pesquisa sozinha 400 ms depois de parar de digitar, ou na hora com Enter; trocar o idioma pesquisa na hora) e "Ordenar por", filtros à esquerda e grade de três colunas. Os componentes são os mesmos: `BarraBusca` (no catálogo, também com o idioma; ela mantém o foco enquanto a URL muda), `PainelFiltros` com `GrupoFiltro` (opções em lista; no desktop aplicam na hora, e até 1023px abrem numa janela com "Limpar filtros" e "Ver resultados", que fecha pelo X, tocando fora ou com Esc sem aplicar), `SelosFiltro` (filtros ativos removíveis, traduzidos: "Tipo: Fogo", "Expansão: Base", "@ash"; "Limpar tudo" com dois ou mais), `GradeCartas` com esqueletos enquanto carrega, esqueleto também nos grupos de filtro que dependem da API (os outros continuam usáveis) e o aviso com "Tentar de novo" quando a API está fora do ar. Tudo fica na URL (F5 e link compartilhado mantêm a busca), e mudar um filtro volta para a página 1. No celular, o que se digita no filtro entra no rascunho na hora, então "Ver resultados" nunca perde o texto. Os nomes dos tipos e categorias ficam em `utils/rotulos.js`.

- **Catálogo (`/catalogo`):** filtros de categoria, tipo, raridade e expansão vindos de `GET /cards/filters` no idioma da busca; trocar o idioma limpa os filtros. Filtro da URL que não existe no idioma (`/catalogo?lang=pt&type=Fire`, expansão inventada) é ignorado em vez de virar erro 400: com filtro na URL, a busca espera as opções chegarem para conferir. Ordena por relevância ou nome (A–Z, Z–A); raridade, mais recentes e mais desejadas aparecem como "em breve".
- **Marketplace (`/marketplace`):** busca pelo nome da carta ou do set (`charizard base`); com menos de 2 letras ou números a busca não vai para a API e a tela avisa. Filtros de condição, acabamento, 1ª edição, tipo, raridade e colecionador (o nome de usuário só filtra quando é válido), e ordenação por mais novos, mais antigos ou nome. Valor inválido na URL (`condition=NM`, `sort=price`) é ignorado em vez de virar erro 400; se as raridades não carregam, o painel mostra o aviso com "Tentar de novo". Vindo da wishlist ou do detalhe (`/marketplace?cardId=base1-4`), aparece o selo "Carta: Charizard (base1-4)". Cada anúncio usa o `CartaCard` (com o painel de tipo, raridade e set no hover, sem chamada extra) e, embaixo, o `CartaAnuncio` mostra variante, condição, quantidade, dono e preço de referência (TCGplayer ou Cardmarket, nunca preço de venda). Logado, a carta que está na sua wishlist ganha "Na sua wishlist" e o seu anúncio aparece como "Seu anúncio". O filtro "Só cartas da minha wishlist" vale só para a página atual, porque o backend não tem esse parâmetro; enquanto a wishlist carrega a tela mostra os esqueletos, e se ela falhar mostra o aviso com "Tentar de novo" em vez de uma lista sem filtro.
- **Navegação:** o `ScrollAoTopo` leva ao topo ao abrir uma página nova, e guarda a posição de cada página: no Voltar do navegador ela volta para onde a pessoa estava, mesmo com a API lenta (reaplica a posição enquanto a lista carrega e para assim que a pessoa rola ou digita). O detalhe do anúncio só oferece "Tentar de novo" quando a API está fora do ar, não em 404. "Ver todas" da home leva ao `/catalogo`.

## Status do projeto

| Parte | Situação |
|---|---|
| Autenticação e autorização | ✅ backend e frontend (login, cadastro, logout) |
| Coleção, perfil público, wishlist | ✅ backend · frontend a fazer |
| Anúncios | ✅ backend · frontend a fazer |
| Ofertas | ✅ backend · frontend a fazer |
| Trocas | ✅ backend · frontend a fazer |
| Frontend | 🟡 home, login e cadastro prontos; demais telas a fazer |

Tarefas e responsáveis: [board do projeto](https://github.com/orgs/GeracaoBezerra/projects/1).

## Como contribuir

1. Pegue uma issue no board e mova para **In progress**.
2. Crie a branch a partir da `develop` atualizada:
   ```bash
   git switch develop
   git pull origin develop
   git switch -c feat/<numero-da-issue>-<descricao>
   ```
3. **Uma issue → uma branch → uma PR**, sempre apontando para a `develop`.
4. Use o template de PR: `Closes #<issue>`, o que muda e **como testar**.
5. A CI precisa passar e um colega precisa revisar antes do merge.
6. A `main` só recebe a `develop` por PR, em releases.

Mudou o banco? Altere o `schema.prisma`, rode `npx prisma migrate dev --name <descricao>` e atualize o [`backend/docs/db.md`](backend/docs/db.md) no mesmo PR. CHECK constraints vão escritas à mão no SQL da migration.

Padrão de commits: `tipo(escopo): descrição`, por exemplo `feat(wishlist): ...`, `fix(db): ...`, `docs: ...`.

Respostas e erros da API seguem o contrato `{ success, data }` / `{ success: false, error }`. Erros de regra são lançados com `AppError(status, mensagem)` no service.
