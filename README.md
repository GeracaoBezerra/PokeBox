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
| Testes | Jest com ts-jest (backend), Vitest com jsdom, Testing Library e MSW (frontend) |
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
| Decorator | `src/cards/catalog/`: `MemoryCachedCatalog` → `InFlightDedupCatalog` → `DbCachedCatalog` → `TcgdexClient` | cada camada acrescenta um comportamento (memória por 1 h, junta pedidos iguais, cópia no banco atualizada por trás depois de 24 h, HTTP) sem mexer nas outras |
| Unit of Work | `PrismaUnitOfWorkFactory` em `src/repositories/` | ofertas e trocas recebem coleção, anúncios, ofertas, trocas e wishlist já dentro da mesma transação (RN-07) |
| Repository | `repositories/<Nome>Repository.ts` + `Prisma<Nome>Repository.ts` | o service conhece a interface, não o Prisma |
| Chain of Responsibility | `src/errors/translators/` | o tratador de erros tenta cada tradutor em ordem; erro novo = tradutor novo, sem mexer no tratador |
| Strategy | `PasswordHasher` (bcrypt) e `TokenSigner` (JWT) em `src/security/` | o `AuthService` não depende da biblioteca |
| Plano B (fallback) | `src/cards/search/`: `LocalCatalogFinder` → `SmartCardFinder` | os dois implementam `CardFinder`. A busca vai ao banco, com ou sem nome e com qualquer filtro (#158); só passa a vez para a busca na TCGdex num idioma ainda não sincronizado, ou com filtro de tipo, raridade ou categoria antes de o sync gravar esses dados. Na frente do catálogo, o `LocalFirstCatalog` responde a lista de sets e os valores dos filtros pelo banco. O `CardService` não sabe qual respondeu |

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

Sincroniza inglês e português (#157) e leva perto de 3 minutos: busca os ~220 sets em inglês (cerca de 24 mil cartas) e os ~126 em português (cerca de 14 mil), com uma pausa de 200 ms entre os sets para não sobrecarregar a TCGdex. Para um idioma só: `npm run catalog:sync -- pt` (aceita `en` e `pt`). Rodar de novo atualiza, não duplica. A TCGdex responde 502 e 503 em rajadas: o script segue com os outros sets e, no fim de cada idioma, tenta de novo os que falharam, em até três voltas (depois de 5, 15 e 30 s); a lista de sets de cada idioma ganha as mesmas voltas. Se um idioma falhar, o outro roda do mesmo jeito. O que ainda falhar é listado e o script termina com erro; basta rodar de novo.

Além das cartas, o sync grava a lista de sets na ordem da TCGdex (`CatalogSet`), os valores dos filtros (`CatalogFilterValue`) e o tipo, a raridade e a categoria de cada carta (#158), pelas listas filtradas da TCGdex (`/en/cards?types=eq:Fire`, cerca de 60 chamadas por idioma). Com isso, o painel de filtros, a busca com filtro e a lista sem nome respondem pelo banco, mesmo com a TCGdex fora e a API recém-reiniciada. Sync completo medido na máquina local: cerca de 3 min 40 s.

Por último, o sync guarda no `CardCache` o detalhe completo de cada carta (ataques, habilidades, variantes, preço de referência) (#192). Com isso, a página de detalhe e o adicionar à coleção ou à wishlist também respondem pelo banco em `en` e `pt`, mesmo para uma carta que ninguém abriu e com a TCGdex fora. São uma chamada por carta (a TCGdex não devolve o detalhe de várias de uma vez), quatro ao mesmo tempo, com as mesmas três voltas de nova tentativa. Por padrão, só busca o detalhe das cartas que ainda não têm: a primeira vez é longa (26 min para as ~38 mil cartas com o banco na própria máquina, e o `CardCache` ficou com 63 MB; com um banco remoto, como o Neon, demora mais, porque cada carta faz duas gravações), e as seguintes só pegam as cartas de sets novos (sync completo de novo: cerca de 3 min 40 s). Para buscar o detalhe de todas de novo: `npm run catalog:sync -- --refresh-details` (dá para combinar com o idioma: `npm run catalog:sync -- pt --refresh-details`). Os dados de uma carta quase nunca mudam depois do lançamento; o que muda é o preço, que é atualizado por trás quando alguém abre a carta (veja "Cache das cartas"). Carta que a TCGdex lista mas não tem detalhe aparece no fim do log e não conta como falha; para as que falham, o log mostra o motivo das 10 primeiras.

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

No backend são dois andares da pirâmide de testes, com comandos separados (o front tem os dele, em [Testes do front](#testes-do-front)):

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

O que a integração cobre (139 testes, um arquivo por área):

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
| `catalog` | catálogo local da busca (#78): com a tabela vazia a busca vai à TCGdex e não tolera erro de digitação; com a tabela preenchida pelas cartas do seed: `charzard` acha o Charizard sem chamar a TCGdex, `charizard base` põe o do Base Set primeiro, `pikachu` em duas páginas sem repetir, `flabebe` acha a Flabébé, palavras ignoradas, só o nome do set, filtro `set`, `sort=name&order=desc`, TCGdex fora do ar; salvar de novo não duplica. Com os filtros sincronizados (#158) e a TCGdex fora: `GET /cards/filters` (sem as coleções vazias, #196), `type` sem nome (sem diferenciar maiúscula), nome + `category`, lista sem nome paginada e valor que não existe (400) |
| `cards` | busca, busca esperta (`charizard base`, palavras ignoradas), ids recusados fora da lista, `limit` acima de 100 (400), detalhe com e sem login, carta inexistente (404), id fora da regra (400); filtros: `GET /cards/filters` (e 502 com a TCGdex fora), TCGdex instável (#145: 503 uma vez responde 200; 503 três vezes → 502 depois de 3 chamadas), `type` sem nome, mesmo nome com tipos diferentes (cache separado), nome + raridade + set, `category` com `sort=name&order=desc` e duas páginas, valor que não existe (400 com `details`) |
| `pagination` | #77: sem parâmetro responde como antes; `limit`/`page` sem repetir item; `q`, `isPublic`, `type`, `finish`, `sort=recent`; `limit=500` (400 com `details`); wishlist `type=Fire` da misty; perfil público com `limit=1` sem itens privados; ofertas e trocas com `side` e sem `side`; `page`/`limit` sem `side` (400); `GET /listings/me` paginado |
| `snapshot` | RN-09: com a TCGdex fora do ar, coleção, wishlist, perfil público e marketplace continuam respondendo com os dados da carta; o detalhe de uma carta já consultada sai da cópia guardada no banco; cópia vencida responde na hora e é atualizada por trás (#192); carta com o detalhe guardado entra na coleção com a TCGdex fora; a leitura ignora a caixa, mas `%` e `_` não viram curinga, e `POST /collection` e `/wishlist` com esses caracteres no `cardId` dão 400 |
| `health` e `errors` | `/health/ready`, TCGdex fora do ar (502), JSON malformado (400), corpo acima de 100 KB (413), rota inexistente (404), id que não é UUID (400), `x-request-id` |

O 504 (TCGdex demorando mais de 8 s) fica só nos testes de unidade do `TcgdexClient`, para a suíte não esperar 8 s. Como a IA ajudou a escrever esses testes, e o que ela errou, está em [`docs/ia.md`](docs/ia.md).

### Testes do front

O front usa o **Vitest**, que aproveita a configuração do Vite (entende JSX, CSS Modules e `import.meta.env`). Os testes rodam no terminal, em segundos, sem navegador de verdade e sem backend:

```bash
cd frontend
npm test
```

`npm test` roda uma vez e termina (é o que a CI usa). `npm run test:watch` fica rodando e repete os testes a cada arquivo salvo.

| Andar | Onde | O que testa |
|---|---|---|
| Funções puras | `src/auth/validator.test.js`, `src/utils/*.test.js`, `src/api/mensagens.test.js`, `src/api/parametros.test.js` | parâmetros de página e filtros das listas (`semVazios`, `parametrosDaPagina`), busca sem acento, filtro do nome no resultado da API, conferência das quantidades oferecidas e textos do resumo da troca na oferta (`utils/oferta.js`), mensagem amigável de cada erro da API e erros por campo (`errosPorCampo`), regras do login e do cadastro (`Validator` + `rules.js`), filtros do marketplace, aba, status e página de Propostas e Trocas lidos da URL, pendentes primeiro e resumo das trocas do perfil (`utils/negociacao.js`) e rótulos (variante, data, preço de referência, contagem de ofertas aguardando, resumo das cartas de uma troca, frase de próximo passo de cada oferta e troca), máscaras de telefone e CEP e validação do perfil |
| Service com fakes | `src/auth/authService.test.js`, `src/auth/gateways/httpAuthGateway.test.js` | `AuthService` com gateway e stores de mentira passados no construtor: login certo, formulário inválido sem chamar a API, API recusando (com mensagem amigável ou erro por campo), cadastro, sessão já salva, logout e inscrição; o `HttpAuthGateway` com um `http` de mentira manda só os campos da API |
| HTTP com a API simulada | `src/api/http.test.js`, `src/api/listas.test.js` | o `http` com respostas falsas do MSW: token no header, `ApiError` com status e `details`, 401 com o token salvo chama `aoExpirarSessao`, 401 do login e 401 sem token não chamam, 401 atrasado de um token antigo não derruba a sessão nova, 401 sem token com sessão na tela chama `aoPerderToken`; as funções de lista sem parâmetro devolvem o formato antigo e com opções mandam `page`, `limit` e só os filtros preenchidos |
| Hook | `src/hooks/useListaPaginada.test.js`, `src/hooks/useMinhasCartas.test.js` | o hook rodando sozinho com o `renderHook` da Testing Library: o "carregar mais" junta as páginas, uma página que falha não é pulada (o próximo clique repete a mesma) e trocar a busca volta para a página 1; a wishlist e a coleção do catálogo com o MSW: falha na primeira vez não vira lista vazia, falha num recarregamento mantém o último estado conhecido |
| Formulário com a API simulada | `src/components/FormOferta/FormOferta.test.jsx` | o "Monte sua oferta" inteiro com a coleção vinda do MSW: uma carta marcada com a quantidade apagada e escondida pela busca bloqueia o envio e aparece no aviso; a busca "fire" não mostra a carta que a API achou só pelo nome da expansão |
| Página com a API simulada | `src/pages/publicPerfil.test.jsx` | o perfil público com a coleção vinda do MSW: busca longa demais na URL não vai para a API e o perfil aparece; 400 de filtro mostra "Filtro inválido" com o campo de busca; 404 e username inválido mostram "Colecionador não encontrado" |
| Componente | `src/components/Aviso/Aviso.test.jsx`, `src/components/AcoesAnuncio/AcoesAnuncio.test.jsx`, `src/components/header/BuscaGeral.test.jsx`, `src/components/ConfirmModal/ConfirmModal.test.jsx`, `src/components/ConfirmacaoProvider/ConfirmacaoProvider.test.jsx`, `src/components/ToastProvider/ToastProvider.test.jsx`, `src/components/ErroCampo/ErroCampo.test.jsx`, `src/components/SessaoExpirada/SessaoExpirada.test.jsx`, `src/components/Abas/Abas.test.jsx` | o componente renderizado com a Testing Library, procurado pelo papel e pelo texto, como a pessoa vê; o modal de confirmação abre com o texto certo, confirmar devolve `true`, cancelar e Esc devolvem `false`; o toast aparece na região viva certa, some sozinho, fecha no X, e o `useAcao` dispara o toast de sucesso; a mensagem do `ErroCampo` vira a descrição acessível do campo; o aviso de sessão expirada mostra o toast e leva ao login guardando a página de origem; as `Abas` têm os papéis ARIA, o Tab para só na aba ativa e as setas, Home e End trocam de aba; a busca do topo descarta o rascunho ao trocar de página e só pesquisa sozinha na página de resultados; fechar um anúncio (com o PATCH no MSW) avisa o selo de pendências e pausar não |

Como está montado:

- Cada teste fica ao lado do arquivo testado, com `.test.js` (ou `.test.jsx`) no nome, e importa `describe`, `it`, `expect` e `vi` do `vitest`.
- O ambiente é o **jsdom**, um navegador de mentira dentro do Node, com `document`, `window` e `localStorage`.
- `src/test/setup.js` roda antes dos testes: completa o `<dialog>` do jsdom (que não tem `showModal()` nem `close()`) com o mínimo para o modal funcionar, liga as verificações do jest-dom (`toBeInTheDocument()` e afins), limpa a tela e o `localStorage` depois de cada teste e liga o **MSW** (`src/test/server.js`), que intercepta as requisições HTTP. Cada teste coloca as respostas falsas de que precisa com `server.use(...)` (veja `src/api/http.test.js`), e qualquer requisição sem resposta combinada é barrada: o teste falha na hora em vez de depender da API.
- O `npm run build` não leva os arquivos de teste para o `dist`.

Os demais hooks, as rotas, as páginas com a API simulada e a cobertura do front entram com a #180.

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

Números de 15/11/2026, medidos na CI, com 682 testes de unidade e 95 de integração. O mínimo é o valor medido menos uns 2 pontos, para uma mudança pequena não quebrar a CI. Abaixo dele, o `npm run test:coverage` termina com erro, a CI fica vermelha e o deploy não sai. A meta é manter os números e subir o mínimo dos ramos aos poucos; 100% não é meta, porque incentiva teste que só pinta linha. A cobertura do front ainda não é medida: isso entra com a #180.

A CI (GitHub Actions, `.github/workflows/ci.yml`) roda em toda PR para `develop` e `main` e em todo push na `develop`:

| Job | O que roda |
|---|---|
| `backend` | sobe um PostgreSQL de teste; `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm run build` e `npm run test:coverage` (unidade + integração, com o mínimo de cobertura). Mostra a tabela de cobertura no resumo da execução e guarda o relatório completo como artefato `coverage-backend` |
| `frontend` | `npm ci`, `npm run lint`, `npm test` (Vitest) e `npm run build` |

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

- Uma vez, depois do deploy que traz a tabela `CatalogCard`, da sua máquina: `cd backend && DATABASE_URL="<URL do Neon>" npm run catalog:sync`. Para trazer o português (#157) sem refazer o inglês: `npm run catalog:sync -- pt`. Depois do deploy da #158 (migration `catalog_filtros`), rodar o sync completo de novo para preencher sets, filtros e o tipo, a raridade e a categoria das cartas. Depois do deploy da #192, rodar o sync de novo para guardar o detalhe de todas as cartas. O melhor é disparar o workflow (Actions > Catalog sync > Run workflow, na `main`): ele roda perto do Neon, cabe no limite de 120 min e não precisa da URL do banco no terminal; se ninguém disparar, o agendamento de segunda faz a carga completa sozinho. A partir daí, o workflow semanal só busca o detalhe das cartas novas. Como o seed, o script não roda dentro da imagem de produção, que não tem o `tsx`.
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

- Cache das cartas da TCGdex em camadas (padrão Decorator, em `backend/src/cards/catalog/`): memória (1 h, até 500 cartas), depois junção de pedidos iguais em andamento, depois a tabela `CardCache` no banco (responde sempre que tem a carta; passadas 24 h, a cópia é atualizada por trás, sem o usuário esperar), e só então a chamada HTTP.
- Cache em memória da busca de cartas (10 min) e da lista de sets (1 dia), e timeout de 8 s nas chamadas à TCGdex.
- A TCGdex falha por alguns segundos com frequência (#145). Quando ela responde 502, 503 ou 504, ou a conexão cai, a API tenta de novo até 2 vezes (espera de 200 ms e 600 ms, sem passar dos 8 s do timeout); 404, outros erros e timeout não são repetidos. Cada nova tentativa aparece no log (`warn`) e como span próprio nos traces. Se mesmo assim ela não responder, a busca, a lista de sets, os filtros e as cartas de um set usam o último resultado guardado em memória, mesmo vencido. Nos idiomas sincronizados (`en` e `pt`), a lista de sets, os filtros e todas as buscas já saem do banco (#158) e não dependem dessa memória.
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
| `GET /cards?name=&page=&limit=&lang=&type=&rarity=&set=&category=&sort=&order=` | | busca cartas, com paginação. Entende nome de set e ignora palavras que não acham nada: `charizard base` traz os Charizard com o do Base Set primeiro, e `charizard base x pipi popo` ainda traz os Charizard. O resultado vem ordenado por relevância, cada carta traz `set: { id, name }` e `number`, e a resposta traz `search: { name, sets, ignored }` dizendo como a busca foi entendida. **Catálogo local (#78):** com o catálogo sincronizado (`npm run catalog:sync`), a busca por nome roda no nosso banco, sem chamar a TCGdex: tolera erro de digitação (`charzard`, `pikachuu`), ignora acento (`flabebe` acha `Flabébé`) e continua funcionando com a TCGdex fora do ar. Palavra curta pode achar um nome parecido (`popo` acha `Po Town`) em vez de ir para `ignored`. Sem nome e com filtro de `type`, `rarity` ou `category`, a busca também roda no banco (#158). Só num idioma ainda não sincronizado (hoje `en` e `pt` são) ela vai à TCGdex como antes. Cartas com id que o detalhe não aceita (fora de letras, números, ponto e hífen) ficam fora da lista: hoje são só as Unown "!" e "?" do set `exu`; por isso uma página pode vir com uma carta a menos. **Filtros (#75):** `type`, `rarity`, `set` (id do set) e `category` filtram pelo valor exato, com ou sem nome; a caixa não importa (`fire` vira `Fire`), e valor que não existe no idioma responde 400 com `details`. `sort=name` com `order=asc` ou `desc` ordena pelo nome no lugar da relevância |
| `GET /cards/filters?lang=` | | opções dos filtros do catálogo no idioma pedido: `{ types, rarities, categories, sets: [{ id, name }] }`. Os valores vêm traduzidos pela TCGdex (em `pt`, `Fire` vira `Fogo`) e os sets na ordem de lançamento. Em `en` e `pt` sai do banco, gravado pelo sync (#158), e a lista de sets traz só os que têm carta naquele idioma: a TCGdex lista em `pt` coleções sem nenhuma carta traduzida (Coleção Básica, as EX, Diamante & Pérola...), que antes apareciam no filtro e não traziam nada (#196). Nos outros idiomas fica 1 dia em memória; com a TCGdex fora do ar usa a última lista guardada, e sem nenhuma guardada → 502 |
| `GET /cards/:id` | 🔓 | detalhe da carta (ataques, variantes, preço de referência) e os anúncios ativos dela. Sai do banco sempre que ele tem a carta (em `en` e `pt`, todas depois do sync, #192); o preço de referência pode ter até um dia. Ataque ou habilidade sem tradução na TCGdex (comum nas cartas Black & White em `pt`) vem com `name: null`, e a tela mostra "Nome não traduzido" (antes, a carta inteira dava 502); com login, traz `user` (quantas você tem, se está na sua wishlist, se você tem anúncio ativo dela) |

### Coleção

| Rota | | O que faz |
|---|---|---|
| `GET /collection?q=&condition=&finish=&isPublic=&setId=&type=&sort=&page=&limit=` | 🔒 | minha coleção, com `available` (quantidade menos reservada), pelo nome da carta. `q` busca por palavras no nome da carta ou do set; `isPublic=false` traz só os privados; `sort` é `name` (padrão) ou `recent` (entrada mais nova primeiro). Paginação opcional |
| `POST /collection` | 🔒 | adiciona carta: `cardId`, `quantity`, `finish`, `firstEdition`, `condition?`, `isPublic?`, `lang?`. `lang` é o idioma em que a carta foi vista no catálogo (padrão `en`, aceita os mesmos idiomas de `GET /cards`, inclusive `pt-br`), para achar cartas que só existem em outro idioma (#163). A carta é buscada primeiro em inglês, para ficar gravada em inglês para todo mundo; o `lang` só é usado quando ela não existe em inglês (ex.: sets japoneses). Idioma fora da lista → 400. `cardId` só aceita letras, números, ponto e hífen, como em `GET /cards/:id` (`%`, `_`, `/` → 400). Se a carta estava na sua wishlist, ela sai (RN-11) e a resposta traz `removedFromWishlist: true` |
| `PATCH /collection/:id` | 🔒 | muda `quantity`, `condition` ou `isPublic`. A condição não muda enquanto o item está num anúncio aberto, numa oferta aberta ou aceita ou numa troca aberta (**409**) |
| `DELETE /collection/:id` | 🔒 | remove o item (não remove se tiver reserva ou se já foi anunciado; nesse caso, zere a quantidade) |
| `GET /users/:username/collection?q=&type=&page=&limit=` | | coleção pública de um colecionador (itens privados nunca aparecem, RN-10). Paginada, a resposta mantém `data: { user, items }` |

### Wishlist

| Rota | | O que faz |
|---|---|---|
| `GET /wishlist?q=&type=&rarity=&sort=&page=&limit=` | 🔒 | minha wishlist, com `opportunities` em cada carta (paginada, calculado só para os itens da página). Paginação opcional |
| `POST /wishlist` | 🔒 | adiciona carta (`cardId`, `lang?` com padrão `en`, os dois com as mesmas regras de `POST /collection`). Carta que você já tem na coleção → **409** (RN-12) |
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
| **RN-09** Snapshot local da carta | Quando uma carta entra numa coleção ou wishlist, nome, set, número, imagem, raridade, tipos e preço de referência são gravados na tabela `Card` (RN-01). Coleção, wishlist, perfil público e marketplace leem dali, sem chamar a TCGdex: com ela fora do ar, essas telas continuam funcionando. O detalhe completo (ataques, habilidades) fica no `CardCache`, preenchido pelo sync em `en` e `pt` (#192), e responde mesmo com a TCGdex fora (veja "Cache das cartas" abaixo). |
| **RN-10** Privacidade | Item com `isPublic: false` não aparece no perfil público. O perfil público nunca mostra e-mail, reserva nem dados internos. Conta desativada ou suspensa → **404**. |
| **RN-11** Coleção limpa a wishlist | Carta que entra na coleção sai da wishlist da pessoa, na mesma transação: vale ao adicionar (`POST /collection`), ao receber numa troca concluída (`POST /trades/:id/accept`) e quando um item zerado volta a ter quantidade (`PATCH /collection/:id`). Como a wishlist não tem variante, qualquer condição ou acabamento conta. |
| **RN-12** Wishlist só do que falta | Carta que você já tem na coleção (quantidade maior que 0, em qualquer variante, pública ou privada) não entra na wishlist (**409**). Item zerado não conta. Junto com a RN-11, a wishlist guarda só o que a pessoa ainda não tem. |

Outras regras que já valem:

- **Variante da carta:** cada item tem `finish` (`NORMAL`, `HOLO`, `REVERSE`) e `firstEdition`. Só aceita combinações que a carta realmente tem na TCGdex (senão **422**).
- **Condição:** `MINT`, `NEAR_MINT`, `EXCELLENT`, `GOOD`, `LIGHT_PLAYED`, `PLAYED` ou `POOR`.
- **Conta:** login de conta suspensa ou inativa → **403**. Excluir a conta só desativa (soft delete); o histórico fica.
- **Cache das cartas:** o detalhe de uma carta sai do banco (`CardCache`) sempre que ele tem a carta. Em `en` e `pt`, o sync já guarda o detalhe de todas (#192); nos outros idiomas, a carta é buscada na TCGdex na primeira vez e guardada. Passadas 24 h, a resposta continua saindo do banco na hora, e a cópia é atualizada pela TCGdex por trás, uma vez só mesmo com vários pedidos ao mesmo tempo (é assim que o preço de referência se mantém em dia; ele pode ter até um dia, ou a data do último sync numa carta que ninguém abriu). Em memória, o detalhe fica 1 h. Antes de desistir, a API tenta de novo até 2 vezes quando a TCGdex responde 502, 503 ou 504 ou a conexão falha. Se a TCGdex cair, a cópia guardada continua respondendo. A busca `GET /cards` guarda o resultado em memória por 10 min e a lista de sets por 1 dia (trocar de página não chama a TCGdex de novo); depois desse prazo o resultado continua guardado e é usado se a TCGdex cair. Sem nenhuma cópia, responde **502** (fora do ar) ou **504** (demorou mais de 8 s), e o front mostra a mensagem com o botão **"Tentar de novo"** no catálogo e no detalhe da carta. O cache é gravado com o id oficial da carta, mesmo que a URL use outra caixa (`/cards/BASE1-4` grava e atualiza o preço de `base1-4`), e a leitura acha a carta em qualquer caixa (`%` e `_` no id valem como letra, não como curinga).
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

Abra `http://localhost:5173`, entre com um usuário do seed e use o menu: Cards (catálogo), Marketplace, Coleção, Wishlist, Anúncios, Propostas, Trocas e Meu perfil. Para mostrar uma troca, use duas janelas (uma normal e uma anônima), uma com o `ash` e outra com a `misty`. Os erros aparecem perto de onde a pessoa está, com a mensagem da API e sem o código HTTP, por exemplo "Você já tem uma oferta aberta neste anúncio" (veja "Avisos e erros" abaixo).

As chamadas ficam em `frontend/src/api/` (axios com interceptores em `http.js`, uma função por rota).

As páginas (`frontend/src/pages/`) só buscam os dados e montam a tela; cada bloco visual é um componente em `frontend/src/components/<Nome>/<Nome>.jsx`. Os reaproveitados entre páginas são `CabecalhoPagina`, `Paginacao`, `CartaMini`, `MiniaturaCarta`, `Abas`, `AbasNegociacao` e `GradeCartas`. A home busca 12 cartas em `GET /cards` e mostra `SkeletonCard` enquanto carrega. A seção `GridCartas` da home e o catálogo (`/catalogo`) reutilizam o `GradeCartas`, que concentra a grade e seu CSS (quatro colunas na home e três no catálogo, no desktop). O `CartaCard` lê diretamente o formato da API (`image.small`, `set.name`) e o das outras telas (`imageUrl`, `setName`), sem adaptador. Em telas acima de 600px, o detalhe (`GET /cards/:id`) é buscado somente ao passar o mouse ou focar a carta; o painel de tipo, raridade, set, número e artista só aparece depois que os dados chegam. Até 600px, esse detalhe não é solicitado pela grade, pois o painel fica oculto. Os tipos em inglês e em português usam as mesmas cores, e as imagens não podem ser arrastadas.

**Catálogo e marketplace no mesmo modelo (#86, #87, #153).** As duas telas têm o mesmo layout: cabeçalho, barra com "Ordenar por" (e o idioma, no catálogo; trocar o idioma pesquisa na hora e limpa os filtros), filtros à esquerda e grade de três colunas. A busca por texto fica num campo só, no topo do site (veja "Busca geral no topo" abaixo). Os componentes são os mesmos: `PainelFiltros` com `GrupoFiltro` (opções em lista; no desktop aplicam na hora, e até 1023px abrem numa janela com "Limpar filtros" e "Ver resultados", que fecha pelo X, tocando fora ou com Esc sem aplicar), `SelosFiltro` (filtros ativos removíveis, traduzidos: "Tipo: Fogo", "Expansão: Base", "@ash"; "Limpar tudo" com dois ou mais), `GradeCartas` com esqueletos enquanto carrega, esqueleto também nos grupos de filtro que dependem da API (os outros continuam usáveis) e o aviso com "Tentar de novo" quando a API está fora do ar. Tudo fica na URL (F5 e link compartilhado mantêm a busca), e mudar um filtro volta para a página 1. No celular, o que se digita no filtro entra no rascunho na hora, então "Ver resultados" nunca perde o texto. Os nomes dos tipos e categorias ficam em `utils/rotulos.js`.

- **Catálogo (`/catalogo`):** filtros de categoria, tipo, raridade e expansão vindos de `GET /cards/filters` no idioma da busca; trocar o idioma limpa os filtros. Filtro da URL que não existe no idioma (`/catalogo?lang=pt&type=Fire`, expansão inventada) é ignorado em vez de virar erro 400: com filtro na URL, a busca espera as opções chegarem para conferir. Ordena por relevância ou nome (A–Z, Z–A); raridade, mais recentes e mais desejadas aparecem como "em breve".
- **Marketplace (`/marketplace`):** busca pelo nome da carta ou do set (`charizard base`); com menos de 2 letras ou números a busca não vai para a API e a tela avisa. Filtros de condição, acabamento, 1ª edição, tipo, raridade e colecionador (o nome de usuário só filtra quando é válido), e ordenação por mais novos, mais antigos ou nome. Valor inválido na URL (`condition=NM`, `sort=price`) é ignorado em vez de virar erro 400; se as raridades não carregam, o painel mostra o aviso com "Tentar de novo". Vindo da wishlist ou do detalhe (`/marketplace?cardId=base1-4`), aparece o selo "Carta: Charizard (base1-4)". Cada anúncio usa o `CartaCard` (com o painel de tipo, raridade e set no hover, sem chamada extra) e, embaixo, o `CartaAnuncio` mostra variante, condição, quantidade, dono e preço de referência (TCGplayer ou Cardmarket, nunca preço de venda). Logado, a carta que está na sua wishlist ganha "Na sua wishlist" e o seu anúncio aparece como "Seu anúncio". O filtro "Só cartas da minha wishlist" vale só para a página atual, porque o backend não tem esse parâmetro; enquanto a wishlist carrega a tela mostra os esqueletos, e se ela falhar mostra o aviso com "Tentar de novo" em vez de uma lista sem filtro.
- **Navegação:** o `ScrollAoTopo` leva ao topo ao abrir uma página nova, e guarda a posição de cada página: no Voltar do navegador ela volta para onde a pessoa estava, mesmo com a API lenta (reaplica a posição enquanto a lista carrega e para assim que a pessoa rola ou digita). O detalhe do anúncio só oferece "Tentar de novo" quando a API está fora do ar, não em 404. "Ver todas" da home leva ao `/catalogo`.
- **Modal de confirmação (#82):** ações sem volta abrem um modal do próprio app (`ConfirmModal`, feito com o `<dialog>` do navegador, sem biblioteca) no lugar da caixinha cinza do `window.confirm`: apagar carta da coleção, fechar anúncio e desativar a conta. O foco começa em "Cancelar" (um Enter sem querer não apaga nada), fica preso no modal, Esc fecha sem agir, e ao fechar o foco volta ao botão que abriu. O `ConfirmacaoProvider` fica montado uma vez no `main.jsx`, e qualquer tela pede confirmação com o hook `useConfirmacao`: `const { pedir } = useConfirmacao()` e `if (!(await pedir({ titulo, mensagem, textoConfirmar, perigo }))) return;`. Para casos especiais (por exemplo, um campo dentro do modal), o `ConfirmModal` também pode ser usado direto, com as props `children` e `confirmarDesativado`.
- **Detalhe do anúncio: dono e moderação (#167):** o dono vê na própria página do anúncio os botões Pausar, Ativar e Fechar (o componente `AcoesAnuncio`, o mesmo da tabela de Meus anúncios; Fechar pede confirmação no modal) e quantas ofertas estão aguardando resposta ("2 ofertas aguardando sua resposta", com link para Propostas). Anúncio fechado ou bloqueado não mostra botões, só a frase do motivo. Para o ADMIN, Bloquear e Desbloquear agora pedem confirmação com o `@` do dono e a consequência (bloquear cancela as ofertas; desbloquear volta como pausado).
- **Propostas e trocas com confirmação (#168):** Aceitar, Recusar e Cancelar oferta (em `/propostas`) e Concluir, Recusar e Cancelar troca (em `/trocas`) pedem confirmação no modal antes de agir, com o `@` da outra pessoa e o que acontece depois. "Concluir troca" mostra o resumo do que cada lado dá e recebe ("Você dá: 1× Pikachu VMAX. Você recebe: 1× Basic Water Energy."). O botão de sair do modal se chama "Voltar", para não confundir com "Cancelar oferta". "Criar troca" continua sem confirmação, porque dá para desfazer com "Cancelar troca".
- **Perfil: máscaras, validação e desativar com o username (#172):** em "Minhas informações", celular e CEP ganham máscara enquanto se digita e na leitura (`(11) 91234-5678`, `01001-000`), e o estado virou uma lista com as 27 siglas. Antes de chamar a API, o front confere as mesmas regras do backend (celular com 10 ou 11 dígitos, CEP com 8, nome com 2 a 120 letras, tamanho máximo dos campos de endereço): com erro, a mensagem aparece embaixo do campo, nada é enviado e o painel continua em edição; o erro some quando a pessoa altera o campo. Telefone e CEP vão para a API só com os dígitos, e salvar sem mudar nada não chama a API. As máscaras são funções próprias (`utils/mascaras.js`), porque o `react-input-mask` não funciona com o React 19 (usa o `findDOMNode`, que o React 19 removeu) e saiu do `package.json`. "Meu perfil" tem o link "Ver como os outros me veem" (abre `/u/<username>`) e, para ADMIN, o selo "Administrador". Desativar a conta abre o modal pedindo para digitar o próprio username: o botão só libera com o nome certo, e fechar o modal limpa o que foi digitado. A busca de endereço pelo CEP (ViaCEP) ainda não entrou.
- **Avisos e erros (#176):** o que dá certo aparece num **toast**, um aviso pequeno no canto da tela (embaixo no celular, em cima à direita no desktop) que some sozinho em 4 segundos (erro em 8) e tem o botão de fechar. Ele é próprio, sem biblioteca: o `ToastProvider` fica montado uma vez no `main.jsx` e qualquer componente usa `const toast = useToast()` e `toast.sucesso(...)`, `toast.info(...)` ou `toast.erro(...)`. As duas regiões vivas (`role="status"` para sucesso e info, `role="alert"` para erro) existem desde o início, para o leitor de tela ler a mensagem quando ela aparece, e a animação de entrada some com "reduzir movimento" ligado. O `useAcao` mostra o toast sozinho quando a ação recebe uma mensagem ("Carta adicionada à coleção."; tirar da wishlist usa o toast de info). Os erros continuam no componente `Aviso`, perto do formulário, e passam pela função `mensagemAmigavel` (`src/api/mensagens.js`): sem conexão vira "Não conseguimos falar com o servidor...", erro 500 ou mais vira "Algo deu errado do nosso lado...", e nos outros casos fica a mensagem da API (sem ela, um texto padrão para 403, 404 e o resto). O código HTTP não aparece mais para quem usa. Toda página que carrega dados mostra "Tentar de novo" quando a API está fora do ar ou responde 500.
- **Erro da API embaixo do campo (#178):** quando a API recusa um formulário por causa de um campo (400 com `details`), o erro aparece embaixo do campo certo, com borda vermelha, `aria-invalid` e `aria-describedby` (o leitor de tela lê o rótulo, "inválido" e a mensagem). A função `errosPorCampo(details)` (`src/api/mensagens.js`) transforma a lista da API em `{ campo: mensagem }`, e o componente `ErroCampo` mostra a mensagem. Vale no login e no cadastro (pelo `AuthService`), no perfil (os erros da API usam o mesmo lugar dos erros que o front já confere), em "Adicionar à coleção" (quantidade), em "Criar anúncio" (quantidade e descrição) e em "Monte sua oferta" (quantidade e mensagem). Com os campos marcados, o aviso geral diz "Confira os campos destacados."; erro de um campo que a tela não mostra (por exemplo, a quantidade de uma carta oferecida) e erro sem campo continuam no aviso geral. E-mail ou username já cadastrado continua como mensagem geral, porque a API não diz qual dos dois. Algumas mensagens ainda vêm em inglês, as padrão do zod (por exemplo, quantidade 0 em anúncio, coleção ou oferta: "Too small: expected number to be >=1"); traduzir é mudança no backend.
- **Sessão expirada sem recarregar a página (#177):** quando o token vence (ou é trocado) e uma rota protegida responde 401, o app sai da conta, mostra o toast "Sua sessão expirou. Entre de novo." e vai para `/login` sem recarregar a página; depois de entrar, volta para a página onde a pessoa estava (vale também para quem abre uma página privada sem estar logado). Senha errada no login não conta como sessão expirada. Um 401 que volta de uma requisição feita com um token antigo (a pessoa já entrou de novo) é ignorado: só o 401 do token que está salvo agora encerra a sessão. Se o token foi apagado à mão e a tela ainda mostra a pessoa logada, o primeiro 401 só fecha a sessão local, sem toast, e o header volta a mostrar "Entrar" na hora. Login e cadastro agora passam pelo mesmo `http` (axios) do resto do app, com as mesmas mensagens de erro ("Não conseguimos falar com o servidor..." quando a API está fora). Por baixo, o `main.jsx` é o único lugar que cria o `LocalTokenStore` e entrega as peças prontas (injeção de dependência): `createAuthService({ http, tokenStore })` e `configurarHttp({ tokenStore, aoExpirarSessao, aoPerderToken })`. O `http.js` não cria store nenhum; guarda na requisição o token que mandou e, no 401, chama `aoExpirarSessao` se esse token ainda é o salvo, que faz o `logout()` e avisa o componente `SessaoExpirada` (dentro do router) pelo avisador `auth/sessaoExpirada.js`.
- **Funções da API com página e filtros (#174):** `listCollection`, `listWishlist`, `listMyListings`, `getPublicCollection`, `listMyOffers` e `listMyTrades` aceitam um objeto `{ page, limit, ...filtros }` e devolvem `{ items, pagination }` (o perfil público também traz o `user`). Sem parâmetro, ou com o status em texto nas ofertas e trocas, continuam devolvendo o mesmo de antes, então nenhuma tela mudou. Com o objeto, sempre vão `page` (padrão 1) e `limit` (padrão 20), e os filtros vazios ficam fora da URL (`semVazios` e `parametrosDaPagina`, em `src/api/parametros.js`). Ofertas e trocas paginadas precisam do `side` (`sent` ou `received`).
- **Propostas e trocas paginadas (#175):** `/propostas` e `/trocas` pedem à API só a aba aberta (`side=received` ou `sent`), com o status e a página, e mostram "Anterior" e "Próxima" embaixo da lista (o componente `Paginacao`, o mesmo do marketplace). Aba, status e página ficam na URL (`/propostas?aba=enviadas&status=ACCEPTED&page=2`), então o F5 e um link mantêm tudo; valor inválido (`?aba=xyz`, `?page=-1`) cai no padrão (Recebidas, todos os status, página 1), e trocar de aba ou de status volta para a página 1. As abas não mostram mais a contagem entre parênteses, porque a API não devolve o total. Se a página ficar vazia (por exemplo, depois de recusar a última oferta dela), aparece "Nenhuma oferta nesta página." e o "Anterior" continua funcionando. A leitura da URL fica no hook `useFiltrosNegociacao`, usado pelas duas páginas.
- **Abas acessíveis (#169):** o componente `Abas` (`src/components/Abas/`) segue o padrão de abas do W3C e não sabe nada de ofertas ou trocas, para ser reaproveitado (a #85 vai usar em Meus anúncios). Props: `rotulo` (nome do grupo para o leitor de tela), `abas` (`[{ valor, rotulo, contagem? }]`), `selecionada`, `onSelecionar` e `idPainel`. O grupo tem `role="tablist"`, cada aba é um `role="tab"` com `aria-selected` e `aria-controls`, e só a aba ativa entra no Tab; as setas esquerda e direita (dando a volta), Home e End trocam de aba na hora e levam o foco junto. O conteúdo fica num `role="tabpanel"` com `aria-labelledby={idDaAba(idPainel, aba)}`. Em `/propostas` e `/trocas`, o `AbasNegociacao` junta as `Abas` (Recebidas e Enviadas) com o filtro de status. Trocar de aba ou de status substitui a URL em vez de criar uma entrada nova no histórico, então o Voltar do navegador leva para a página anterior; mudar de página continua criando entrada, como no marketplace.
- **Pendências (#170):** o header mostra um selo com o número de ofertas recebidas aguardando resposta ao lado de "Propostas", e de trocas recebidas esperando você concluir ao lado de "Trocas" (só quando passa de zero). Com pendência, o link já abre as recebidas pendentes (`/propostas?aba=recebidas&status=PROPOSED`), e o leitor de tela ouve "Propostas, 2 aguardando resposta". A contagem vem do hook `usePendencias` (duas chamadas com `status=PROPOSED`, contadas no front), que atualiza a cada troca de página e logo depois de aceitar, recusar, cancelar, criar ou concluir algo, e de fechar um anúncio (que cancela as ofertas abertas dele): os cartões e o `AcoesAnuncio` disparam um evento do navegador (`avisarQuePendenciasMudaram()`) e o header escuta, sem passar props. Sem login ou com erro na contagem, não aparece selo. Na aba Recebidas, as ofertas e trocas que esperam você vêm primeiro (dentro da página atual) e ganham uma borda de destaque. Cada cartão diz o próximo passo embaixo do status ("Aceite ou recuse esta oferta.", "Aceita. Agora crie a troca para reservar as cartas.", "Aguardando @ash concluir.", "As cartas já mudaram de dono."; os textos ficam em `utils/rotulos.js`). As listas vazias levam a algum lugar ("Você ainda não fez ofertas." com "Explorar o marketplace", por exemplo), e com filtro de status sem resultado aparece "Nada com este status." com o botão "Ver todos os status". A grade de cartões cabe em telas de 320px.
- **Perfil com resumo das trocas (#171):** a seção "Minhas trocas" do `/perfil` mostra só as contagens (concluídas, em andamento, recusadas ou canceladas), um link "Ver todas as trocas" para `/trocas` e, quando há troca recebida esperando você, "1 troca esperando você concluir" com link para `/trocas?aba=recebidas&status=PROPOSED`. Sem trocas: "Você ainda não fez nenhuma troca." com link para o marketplace. A lista detalhada, com as ações, fica só em `/trocas`. O componente novo é o `ResumoTrocas` (a conta fica em `resumirTrocas`, em `utils/negociacao.js`), e saíram o `HistoricoTrocas`, o `TrocaItem` e o `CartaTroca`, com a tabela de status e a função de data repetidas que eles tinham: `STATUS_TROCA` e `formatarData` existem só em `utils/rotulos.js`.
- **Oferta com busca e resumo (#166):** em "Monte sua oferta", o campo "Buscar na sua coleção" filtra as cartas a cada tecla pelo nome, sem diferenciar maiúscula, minúscula e acento ("pokemon" acha "Pokémon"). Com pelo menos uma palavra de 2 letras, a busca também vai para a API (`GET /collection?q=...`, 300 ms depois de parar de digitar), e o resultado da API se junta ao filtro local. O que vem da API passa pelo mesmo filtro do nome da carta, porque a API também procura no nome da expansão: buscar "fire" mostra só cartas com "fire" no nome, e não todas as da "FireRed & LeafGreen". Limitação: a API não ignora acento no nome guardado, então "pokemon" só acha "Pokémon" entre as cartas já carregadas na tela. A coleção agora vem paginada (20 cartas por vez, também na busca), com o botão "Carregar mais cartas" quando tem mais. As cartas marcadas ficam guardadas inteiras, então continuam na oferta, no contador "X/20" e no resumo mesmo quando saem da busca. Busca sem resultado mostra "Nenhuma carta da sua coleção com esse nome." e "Limpar busca". Logo acima de "Enviar oferta", o quadro "Resumo da troca" (`ResumoTroca`, com `aria-live="polite"`) diz "Você recebe: 2× Pikachu (Normal, Near Mint) de @ash." e "Você dá: 2× Fire Energy (Normal, Excellent), 1× Magikarp (Normal, Excellent).", e muda sozinho a cada carta marcada ou quantidade alterada. Antes de enviar, o formulário confere a quantidade de todas as cartas marcadas, inclusive as que a busca escondeu: se alguma está vazia ou fora do limite, a oferta não sai e o resumo avisa qual carta corrigir ("Corrija a quantidade oferecida de Fire Energy (de 1 a 3) antes de enviar."). A paginação com "carregar mais" fica no hook `useListaPaginada`: se uma página falha, as cartas já carregadas continuam na tela e o próximo "Carregar mais cartas" pede de novo a página que falhou (testado em `useListaPaginada.test.js`).
- **Português como idioma padrão (#185):** o catálogo, o detalhe da carta e as "Cartas em destaque" da home abrem em português; no catálogo, o select de idioma começa em "Português" e os filtros vêm traduzidos ("Fogo", "Treinador"). Quem escolhe outro idioma continua com `?lang=` na URL. Como a TCGdex só tem em português as coleções mais novas (a partir de Black & White), o detalhe aberto sem `?lang` (os links da coleção, wishlist, anúncios e marketplace) tenta o português e, se a carta não existir nele, mostra em inglês com o aviso "Esta carta não tem versão em português; mostrando em inglês." Com `?lang=pt` na URL não há plano B: a pessoa pediu aquele idioma. Buscando por nome em português, o catálogo mostra "Não achou? As coleções antigas só existem em inglês. Procurar em inglês", que repete a busca em inglês, sem os filtros. O idioma padrão, o de reserva e a lista de idiomas ficam num lugar só (`utils/idioma.js`). O backend continua com `en` como padrão.
- **Busca geral no topo (#153):** o site tem um campo de busca só, o do header (componente `BuscaGeral`, o mesmo no desktop e no celular, onde fica abaixo do logo). Ele entende a página: no `/marketplace` e no detalhe de um anúncio busca anúncios (`/marketplace?q=...`, "Buscar no marketplace…"); nas outras páginas busca cartas (`/catalogo?name=...`, "Buscar cartas…"). O campo mostra o termo que está na URL (abrir `/catalogo?name=eevee` mostra "eevee") e acompanha a troca de página: o texto digitado sem Enter é descartado quando a pessoa vai para outra página (digitar "pikachu" na home e clicar em Cards abre o catálogo sem buscar nada). Já no catálogo ou no marketplace, pesquisa sozinho 400 ms depois de parar de digitar (ou na hora com Enter) e mantém idioma, filtros e ordenação, voltando só para a página 1; nas outras páginas, só o Enter leva aos resultados. No marketplace, com menos de 2 letras ou números a página mostra o aviso sem chamar a API. Digitar `@ash` + Enter abre o perfil `/u/ash`; nome inválido (`@a`) mostra "Nome de usuário inválido" embaixo do campo, sem sair da página. O formulário tem `role="search"` e o rótulo muda com a página, e o foco não sai do campo enquanto a URL muda. As regras ficam em `utils/buscaGeral.js`. Sugestões enquanto digita ficam para depois (precisam de uma rota de busca de usuários no backend).
- **Quero e Tenho no catálogo (#162):** embaixo de cada carta do `/catalogo` há dois botões, fora do link da imagem (clicar neles não abre a carta). **Quero** (coração) liga e desliga a carta na wishlist, com `aria-pressed` e o coração preenchido quando ela está lá; para quem já tem a carta na coleção ele fica desabilitado ("Você já tem esta carta"), porque a API não deixa (409). **Tenho** (+, ou ✓ se você já tem) abre um modal com o formulário de adicionar à coleção, com a carta já escolhida e só os acabamentos que ela tem; ao adicionar, o modal fecha, aparece o toast e, se a carta estava na wishlist, o coração fica vazio e desabilitado (a API tira da wishlist sozinha). Esc ou "Fechar" fecham sem adicionar, e o foco volta para o botão "Tenho". A wishlist e a coleção são carregadas uma vez ao abrir o catálogo (logado) e de novo depois de cada mudança. As duas consultas são independentes (`Promise.allSettled`, no hook `useMinhasCartas`): se uma falha, o catálogo mostra o aviso com "Tentar de novo" e guarda a que deu certo; se já havia um estado anterior, os botões continuam com ele, e se nunca carregou, "Quero" e "Tenho" ficam desligados em vez de fingir que a wishlist está vazia. Deslogado, os botões aparecem e levam ao login, que volta para a mesma busca. A carta vai com o idioma do catálogo (`lang`). A home continua sem botões. Os componentes são o `AcoesRapidas` (só os botões, reaproveitável) e o `ConfirmModal`, que agora mostra só o botão de fechar quando não recebe `onConfirmar`; o `CartaCard` e o `GradeCartas` ganharam a prop `acoes`.
- **Perfil público (#173):** o `/u/:username` não tem mais o campo "Ver perfil de" (o componente `BuscaPerfil` saiu; para achar alguém, digite `@usuario` na busca do topo). O cabeçalho mostra nome, `@username`, "no PokeBox desde" e "N anúncios ativos" (link para `/marketplace?username=...`; "100+" quando há mais de 100, e nada quando não há anúncio). As cartas anunciadas ganham o selo "Para troca", que leva ao anúncio; se os anúncios não carregarem, a coleção aparece sem os selos. A coleção tem busca por nome da carta ou do set e filtro de tipo, feitos pela API, com 24 cartas por página e tudo na URL (`/u/ash?q=pikachu&type=Lightning&page=2`); tipo ou página inválidos caem no padrão, busca sem palavra de 2 letras mostra a dica e não vai para a API, e mudar a busca ou o tipo volta para a página 1. Sem cartas aparece "Nenhuma carta pública."; com filtro, "Nenhuma carta com esses filtros" e "Limpar filtros". Busca com mais de 50 caracteres (o limite da API) mostra a dica "A busca aceita até 50 caracteres..." e não vai para a API, e o perfil continua na tela. Perfil que não existe, conta desativada ou nome fora do formato (404, ou 400 do `username`) mostram "Colecionador não encontrado" com link para o marketplace; um 400 de filtro (qualquer outro campo) mostra "Filtro inválido" com "Limpar filtros" e mantém o campo de busca para corrigir; API fora do ar continua no aviso com "Tentar de novo". A leitura da URL e o cruzamento com os anúncios ficam em `utils/perfilPublico.js`.
- **Header (#79, em partes):** logado, o botão da conta mostra "Olá, <primeiro nome>" no desktop (com o `username` quando não há nome); no celular fica só o ícone. O leitor de tela lê "Olá, <nome>. Menu do usuário".

## Status do projeto

| Parte | Situação |
|---|---|
| Backend | ✅ todas as rotas em produção (autenticação, cartas e catálogo local em `en` e `pt`, coleção, wishlist, perfil, anúncios, ofertas, trocas e admin), com testes de unidade e de integração na CI |
| Deploy | ✅ API no Render, banco no Neon e front na Vercel, com deploy automático a cada release |
| Frontend | 🟡 todas as telas existem e conversam com a API (home, login, cadastro, catálogo, detalhe da carta, marketplace, detalhe do anúncio, coleção, wishlist, meus anúncios, propostas, trocas, perfil e perfil público); o pacotão da PR #195 trouxe modal de confirmação, toasts e mensagens amigáveis, erro embaixo do campo, sessão expirada sem recarregar, listas paginadas com filtros na URL, abas acessíveis, selo de pendências, oferta com busca e resumo, busca geral no topo, Quero e Tenho no catálogo, português como idioma padrão e perfil público com busca; em andamento: o resto do acabamento das telas |
| Testes do front | 🟡 feito: Vitest (#179), com 238 testes rodando na CI (funções puras, `AuthService`, `http` com MSW, componentes, hooks e algumas telas); a fazer: cobertura e o resto dos hooks e páginas (#180) e E2E com Cypress (#181, #182) |

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
