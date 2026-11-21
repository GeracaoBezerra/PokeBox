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
  - [E2E com Cypress](#e2e-com-cypress)
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
| Testes | Jest com ts-jest (backend), Vitest com jsdom, Testing Library e MSW (frontend), Cypress com Testing Library (E2E) |
| Documentação da API | Swagger em `/docs` |
| Infra | Docker Compose (modo dev e modo produção), GitHub Actions (CI e deploy), Render (API), Neon (banco), Vercel (front) |

## Estrutura do repositório

```
.
├── backend/
│   ├── prisma/            schema, migrations, seed e cartas do seed (seed-data/cards.json e catalog-pt.json)
│   ├── docs/db.md         modelo de dados, constraints, migrations e seed
│   ├── docs/guia-backend  guia do backend e das regras de negócio (.md e .pdf)
│   ├── scripts/           seed-cards.ts (regera as cartas do seed), seed-if-empty.ts (seed só com o banco vazio, usado pelo Compose), sync-catalog.ts (catálogo da busca), clean-dist.mjs e copy-generated.mjs (build)
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
├── e2e/                   testes E2E com Cypress (package.json próprio, reset do banco e login rápido)
├── .github/workflows/     ci.yml (testes), e2e.yml (Cypress), deploy.yml (testes, depois Render e Vercel) e catalog-sync.yml (catálogo da busca, toda segunda)
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
```

No Compose local, o backend espera o PostgreSQL ficar saudável, aplica as migrations e, **só se o banco estiver vazio** (nenhum usuário), roda o seed antes de iniciar a API (`npm run db:seed-if-empty`). Na primeira subida, então, preencha antes `SEED_ADMIN_PASSWORD` e `SEED_DEMO_PASSWORD` no `.env`: sem elas o seed para, diz o que falta e o backend não sobe. Nas subidas seguintes o log mostra `Seed pulado: o banco já tem N usuário(s)` e nada é mexido, então os testes feitos à mão (uma oferta aceita, um anúncio fechado) continuam lá e o backend sobe mesmo sem as senhas no `.env`. Para rodar o seed de novo, à mão: `make seed` (ou `cd backend && npm run db:seed`).

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| Saúde da API | http://localhost:3000/health |
| PostgreSQL | `localhost:5432` |

O compose de desenvolvimento usa o estágio `dev` dos Dockerfiles: o front roda o servidor do Vite e o backend tem as ferramentas de desenvolvimento, por isso o seed funciona com `docker compose exec`. A API tem healthcheck no `/health`, e o front só sobe depois que ela responde.

Com o ambiente de desenvolvimento já rodando, execute `docker compose watch --no-up tcg-frontend` em outro terminal. Enquanto o comando estiver ativo, o Compose sincroniza as alterações do frontend com o container e o Vite atualiza a página automaticamente. Alterações em `package.json`, `package-lock.json` ou no Dockerfile do frontend reconstroem o serviço. Para subir o ambiente e iniciar a sincronização juntos, use `docker compose up --watch`.

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

O seed não roda dentro da imagem de produção, porque ela não tem o `tsx`: no modo produção o backend usa o comando da própria imagem (só migrations e API; o `docker-compose.prod.yml` desliga o comando com seed do compose de desenvolvimento). Se o banco estiver vazio, rode da sua máquina: `make seed`.

### Depois de puxar a develop

Se chegou dependência nova no `backend/package.json` (a migração para TypeScript trouxe várias), rode `cd backend && npm install` antes do `npm run dev`. Scripts locais que importam o código do backend, como um `playground.js`, rodam com `npx tsx playground.js`.

Se chegou migration nova (pasta `backend/prisma/migrations`), atualize o banco e o cliente do Prisma:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run db:seed
```

No Docker: `docker compose up -d --build tcg-backend` (aplica as migrations) e, se quiser os dados novos do seed, `make seed`. Com o banco já populado, a subida não roda o seed sozinha.

### Começar o banco do zero

Apaga **todos** os dados locais:

```bash
docker compose down -v
docker compose up -d --build
```

Com o banco vazio, o backend roda o seed sozinho na subida.

### Catálogo local da busca

A busca de cartas por nome (`GET /cards?name=`) procura numa cópia resumida de todas as cartas da TCGdex guardada no Postgres (tabela `CatalogCard`, #78). A mesma rota aceita `sort=recent`, `sort=wanted` e `sort=traded`: a ordenação acontece no banco antes da paginação, usando a ordem dos sets, as wishlists e as unidades de trocas concluídas. Essa cópia é preenchida por um script, não pela API:

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
| `ash` | `ash@pokebox.dev` | USER | São Paulo/SP | 13 itens: Charizard holo 1ª edição (anunciado), Pikachus, Ultra Ball (4), Furret e Lightning Energy (privados); trocou o Pikachu VMAX anunciado por 3 Eevee do `gary` (troca concluída) |
| `misty` | `misty@pokebox.dev` | USER | Rio de Janeiro/RJ | 12 itens: Blastoise holo e Gyarados (anunciados), Greninja ex (anúncio pausado), Mew ex holo, Fire Energy (10), cartas de água; troca concluída com o `brock` (3 Magikarp pelo Garchomp ex) |
| `brock` | `brock@pokebox.dev` | USER | Belo Horizonte/MG | 17 itens: Palkia, Garchomp ex, Snorlax VMAX, Iono (anunciados); trocas concluídas com a `erika` e com a `misty` (o Garchomp ex anunciado) e uma troca **aberta** com a `cynthia` |
| `gary` | `gary@pokebox.dev` | USER | Curitiba/PR | 18 itens: vários Charizard (anunciados, um **bloqueado** pelo admin); trocas concluídas com a `cynthia` e com o `ash` (3 Eevee pelo Pikachu VMAX) |
| `erika` | `erika@pokebox.dev` | USER | Porto Alegre/RS | 15 itens: Venusaur, Celebi V, Sylveon VMAX (anunciados), Nest Ball (pausado); troca em andamento com o `brock`, já confirmada por ela |
| `dawn` | `dawn@pokebox.dev` | USER | Recife/PE | 10 itens, todos **privados**: o perfil público dela aparece vazio |
| `cynthia` | `cynthia@pokebox.dev` | USER | Florianópolis/SC | 22 itens raros: Umbreon VMAX alt art, Lugia 1ª edição, Mew ex dourado (anunciados); troca aberta com o `brock` esperando ela aceitar |
| `lance` | `lance@pokebox.dev` | USER | Salvador/BA | conta **desativada**: não entra, o perfil dá 404, o anúncio dele some da vitrine e as cartas dele não contam nas oportunidades da wishlist |

O seed cria 87 cartas reais (todas com imagem), 111 itens de coleção, que viram 121 depois das trocas concluídas (alguns privados, com quantidade maior que 1 e variantes holo, reverse e 1ª edição), 44 itens de wishlist (vários com cartas que outros têm), 30 anúncios (20 na vitrine com datas espalhadas: 18 ativos e, no fim, 2 **Em troca**, o Venusaur da `erika` e a Double Turbo da `cynthia`; 2 pausados, 1 bloqueado, 6 fechados, 4 deles pelas trocas concluídas), 16 ofertas (6 em aberto, uma delas **em espera**: a do `gary` no Venusaur da `erika`; 6 aceitas, todas com troca; 2 recusadas, 2 canceladas) e 6 trocas (4 concluídas e 2 em andamento, com as cartas reservadas: `brock` ↔ `erika`, já confirmada pela `erika` e esperando o `brock`, e `brock` ↔ `cynthia`, sem confirmação). Não há oferta aceita sem troca. Ofertas e trocas são criadas pelos mesmos services da API e pelo mesmo fluxo da tela (oferta, aceite que cria a troca, confirmações), então reservas e quantidades seguem as regras (RN-07 e RN-08).

Para a home e os rankings (#92), o seed também grava um mini catálogo nos dois idiomas, como o `catalog:sync`: em `en` as 87 cartas e em `pt` as 62 que existem em português na TCGdex (as coleções a partir de Black & White; as de Base Set a Diamond & Pearl só existem em inglês), com nomes, sets e filtros em português (`backend/prisma/seed-data/catalog-pt.json`). O ranking já sai claro: Umbreon VMAX em 7 wishlists, Charizard (Base Set) em 6, Charizard ex em 5 e Blastoise em 4 (a wishlist do `lance`, desativado, não conta); em português, sem as cartas antigas, fica Umbreon VMAX (7), Charizard ex (5) e Sylveon VMAX (2). Até rodar `npm run catalog:sync`, os filtros e a busca mostram só essas cartas. A seção "Mais desejadas" da home continua com o inglês de reserva (como na #185): se o ranking em português vier vazio, ela mostra o mesmo ranking em inglês, com as cartas e o "Ver todas" abrindo em `lang=en`. Erro na busca em português não dispara a reserva: aparece o aviso de sempre.

Rodar o seed de novo volta as ofertas em aberto do exemplo (como a da misty, que oferece o Mew holo pelo Charizard do ash) para `PROPOSED`, a não ser que já tenham virado troca ou o anúncio esteja em troca (aí o seed avisa; para recomeçar, `npx prisma migrate reset`, que apaga o banco local). As trocas só ganham a confirmação que faltar; as finalizadas e as ofertas recusadas ou canceladas do exemplo não são refeitas. Detalhes em [`backend/docs/db.md`](backend/docs/db.md#seed).

O seed **pode rodar várias vezes** sem duplicar nada e funciona sem internet, porque as cartas ficam em `backend/prisma/seed-data/cards.json` (e o catálogo em português em `catalog-pt.json`).

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
- A RN-07 tem um teste próprio (`tradeRollback.int.test.ts`): ele força um erro no meio da conclusão de uma troca (segunda confirmação) e no meio do aceite da oferta (a troca nascendo) e confere que quantidades, reservas, confirmações, oferta e anúncio ficaram iguais.
- A integridade da coleção (#213) tem um teste por caminho (`tradeConservation.int.test.ts`): concluir, recusar e cancelar depois de confirmar, aceite que falha, duas trocas no mesmo anúncio (uma conclui e a outra cancela: a quantidade volta ao anúncio), anúncio que fecha de verdade e anúncios de quem ofertou. Em cada um, o total de cada carta somando todas as coleções não muda, desistir deixa cada coleção (quantidade e reserva) igual ao início, concluir muda só as cartas da troca, e ao fim valem os dois invariantes: reserva de cada item = soma das trocas abertas que o usam, e anunciado + reservado ≤ quantidade.

O que a integração cobre (170 testes, um arquivo por área):

| Arquivo | Casos |
|---|---|
| `auth` | cadastro, e-mail e username repetidos (409), senha curta (400 com `details`), login certo e errado (401), sem token e token inválido (401), `admin-check` (403/200), limite de tentativas (429 com `Retry-After`, outro e-mail entra) |
| `user` | editar o perfil, campo inválido ou a mais (400), excluir a conta: login depois → 403 e perfil público → 404; com troca aberta (qualquer lado) → 409 e nada muda, nem as outras ofertas; sem troca, cancela as ofertas feitas e recebidas (`ACCOUNT_DEACTIVATED`) e fecha os anúncios |
| `collection` | adicionar e listar com `available`; RN-01 (a carta é gravada uma vez só); RN-02 (403 e 404); RN-03 (soma, quantidade negativa 400 e CHECK no banco); variante que a carta não tem (422); quantidade abaixo do anunciado (422) e apagar item anunciado (409); condição presa (409); RN-11 nos três caminhos |
| `wishlist` | adicionar, listar, remover; repetida (409); `opportunities` conta só item público de outra pessoa; RN-12 (tem a carta, mesmo privada → 409; item zerado → 201) |
| `profile` | RN-10: item privado, e-mail e reserva não aparecem; usuário inexistente (404) |
| `listings` | RN-05 (403, 422, soma dos anúncios abertos); pausar, fechar sem volta, bloqueio só do ADMIN; marketplace: `q`, `type`, `rarity`, filtros somados, `sort=name`, valor inválido (400 com `details`), `GET /listings/me`; Em troca: no fim do marketplace, também entre páginas; detalhe público sem dado da negociação; dono não muda a quantidade nem reativa (409), pausa, fecha (ofertas em espera canceladas); ADMIN bloqueia |
| `offers` | RN-06: próprio anúncio (422), anúncio pausado (404), anúncio em troca (422), carta de outra pessoa (403), mais do que tem (422), segunda oferta (409), quem aceita e quem cancela (403), oferta finalizada não muda (422); fechar e bloquear o anúncio cancelam as ofertas com o motivo; quem vê a oferta; carta em oferta aberta não é apagada (409); oferta recusada guarda as cartas oferecidas mesmo depois de o item sair da coleção |
| `trades` | aceitar cria a troca (tradeId, reserva dos dois lados, anúncio Em troca); cartas indisponíveis no aceite (422, nada muda); oferta aceita não muda (409); outras ofertas ficam em espera (aceitar 422, cancelar com motivo); `POST /trades` (409, 403, 422); as duas partes confirmam: a primeira só grava a data, confirmar de novo 409, a segunda troca as cartas (RN-07) com RN-11 e fecha o anúncio; troca finalizada não muda (409); recusar e cancelar (mesmo depois de confirmar) devolvem a reserva e a quantidade ao anúncio; anúncio fechado no meio-tempo não reabre, pausado recebe a quantidade e continua pausado, e fecha se a troca concluir; quem vê a troca (inclusive ADMIN → 403) |
| `tradeConservation` | conservação da coleção em cada caminho da troca (#213), descrita acima |
| `tradeRollback` | falha forçada no meio da conclusão e no meio do aceite da oferta: nada muda |
| `catalog` | catálogo local da busca (#78): com a tabela vazia a busca vai à TCGdex e não tolera erro de digitação; com a tabela preenchida pelas cartas do seed: `charzard` acha o Charizard sem chamar a TCGdex, `charizard base` põe o do Base Set primeiro, `pikachu` em duas páginas sem repetir, `flabebe` acha a Flabébé, palavras ignoradas, só o nome do set, filtro `set`, `sort=name&order=desc`, TCGdex fora do ar; salvar de novo não duplica. Com os filtros sincronizados (#158) e a TCGdex fora: `GET /cards/filters` (sem as coleções vazias, #196), `type` sem nome (sem diferenciar maiúscula), nome + `category`, lista sem nome paginada e valor que não existe (400); rankings `recent`, `wanted` e `traded` (#92) |
| `cards` | `user.myListing` com anúncio Em troca; busca, busca esperta (`charizard base`, palavras ignoradas), ids recusados fora da lista, `limit` acima de 100 (400), detalhe com e sem login, carta inexistente (404), id fora da regra (400); filtros: `GET /cards/filters` (e 502 com a TCGdex fora), TCGdex instável (#145: 503 uma vez responde 200; 503 três vezes → 502 depois de 3 chamadas), `type` sem nome, mesmo nome com tipos diferentes (cache separado), nome + raridade + set, `category` com `sort=name&order=desc` e duas páginas, valor que não existe (400 com `details`) |
| `pagination` | #77: sem parâmetro responde como antes; `limit`/`page` sem repetir item; `q`, `isPublic`, `type`, `finish`, `sort=recent`; `limit=500` (400 com `details`); wishlist `type=Fire` da misty; perfil público com `limit=1` sem itens privados; ofertas e trocas com `side` e sem `side`; ofertas recebidas com a pendente mais antiga na página 1 e as páginas seguintes sem repetir (#199), e as em espera depois das que dá para aceitar (#213); `page`/`limit` sem `side` (400); `GET /listings/me` paginado |
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
| Funções puras | `src/auth/validator.test.js`, `src/utils/*.test.js`, `src/api/mensagens.test.js`, `src/api/parametros.test.js` | parâmetros de página e filtros das listas (`semVazios`, `parametrosDaPagina`), busca sem acento, filtro do nome no resultado da API, conferência das quantidades oferecidas e textos do resumo da troca na oferta (`utils/oferta.js`), mensagem amigável de cada erro da API e erros por campo (`errosPorCampo`), regras do login e do cadastro (`Validator` + `rules.js`), filtros do marketplace, aba, status e página de Propostas e Trocas lidos da URL, resumo das trocas do perfil (`utils/negociacao.js`) e rótulos (variante, data, preço de referência, contagem de ofertas aguardando, resumo das cartas de uma troca, frase de próximo passo de cada oferta e troca, com oferta em espera, motivo do cancelamento e quem já confirmou a troca), trocas esperando a sua confirmação dos dois lados (`trocasEsperandoConfirmacao`), máscaras de telefone e CEP e validação do perfil |
| Service com fakes | `src/auth/authService.test.js`, `src/auth/gateways/httpAuthGateway.test.js` | `AuthService` com gateway e stores de mentira passados no construtor: login certo, formulário inválido sem chamar a API, API recusando (com mensagem amigável ou erro por campo), cadastro, sessão já salva, logout e inscrição; o `HttpAuthGateway` com um `http` de mentira manda só os campos da API |
| HTTP com a API simulada | `src/api/http.test.js`, `src/api/listas.test.js` | o `http` com respostas falsas do MSW: token no header, `ApiError` com status e `details`, 401 com o token salvo chama `aoExpirarSessao`, 401 do login e 401 sem token não chamam, 401 atrasado de um token antigo não derruba a sessão nova, 401 sem token com sessão na tela chama `aoPerderToken`; as funções de lista sem parâmetro devolvem o formato antigo e com opções mandam `page`, `limit` e só os filtros preenchidos |
| Hook | `src/hooks/useCarregar.test.js`, `src/hooks/useAcao.test.jsx`, `src/hooks/usePendencias.test.jsx`, `src/hooks/useListaPaginada.test.js`, `src/hooks/useMinhasCartas.test.js` | o hook rodando sozinho com o `renderHook` da Testing Library: o `useCarregar` (usado por quase todas as páginas) começa carregando, entrega os dados ou o erro, volta a carregar no `recarregar()` e na troca de chave, esconde o erro antigo enquanto recarrega e ignora a resposta atrasada de uma chave antiga; o `useAcao` devolve `{ ok, resultado }` ou `{ ok: false, erro }`, fica `ocupado` enquanto a ação roda e mostra o toast só quando dá certo; o `usePendencias` (selo do topo, com o MSW) não chama a API sem login, conta as ofertas recebidas que dá para aceitar (as em espera não contam) e as trocas em andamento, enviadas e recebidas, em que falta a sua confirmação, conta de novo no aviso de mudança e ao trocar de conta, volta a zero no logout e, ao trocar de página, só conta de novo depois de 1 minuto; o "carregar mais" junta as páginas, uma página que falha não é pulada (o próximo clique repete a mesma), trocar a busca volta para a página 1, `atualizarCarregadas()` busca de novo todas as páginas já abertas sem duplicar e sem esconder a lista, e `tentarDeNovo()` repete a busca que falhou; a wishlist e a coleção do catálogo com o MSW: falha na primeira vez não vira lista vazia, falha num recarregamento mantém o último estado conhecido |
| Rota privada | `src/components/RotaPrivada/RotaPrivada.test.jsx` | com o `MemoryRouter` (roteador que guarda a URL na memória): sem sessão, vai para o login guardando a página de origem com os filtros da URL em `state.de`; com sessão, mostra a página; se a sessão acaba com a página aberta, vai para o login |
| Formulário com a API simulada | `src/components/FormOferta/FormOferta.test.jsx`, `src/components/VoceEACarta/VoceEACarta.test.jsx` | o "Monte sua oferta" inteiro com a coleção vinda do MSW: uma carta marcada com a quantidade apagada e escondida pela busca bloqueia o envio e aparece no aviso; a busca "fire" não mostra a carta que a API achou só pelo nome da expansão; o atalho "Anunciar esta carta" do detalhe da carta: com uma cópia livre mostra a variante e anuncia essa cópia, com várias pergunta "Qual cópia?" e anuncia a escolhida, erro da API aparece no modal aberto, cópias todas reservadas mostram o aviso, Esc e Fechar não criam nada; com anúncio ativo, pausado ou em troca, "Ver meu anúncio" aponta para o próprio anúncio e o aviso diz se ele está ativo, pausado ou em troca; sem anúncio, aparece "Anunciar esta carta" |
| "Mais desejadas" da home com a API simulada | `src/components/GridCartas/GridCartas.test.jsx` | com o MSW: ranking em português vazio mostra o de inglês, com as cartas e o "Ver todas" em `lang=en`; com cartas em português, não busca em inglês; erro no português mostra o aviso e não busca em inglês |
| Página com a API simulada | `src/pages/wishlist.test.jsx`, `src/pages/myOffers.test.jsx`, `src/pages/listing.test.jsx`, `src/pages/publicPerfil.test.jsx`, `src/pages/catalog.test.jsx` | a wishlist (`/procuro`) inteira com o MSW e os mesmos providers do app (`renderWithProviders`): lista vazia com o card de adicionar, itens com expansão, colecionadores, preço de referência e "Procurar anúncios", a primeira página pedida com 23 cartas, remover só depois de confirmar no modal e a lista se atualiza sem recarregar, remoção que falha mostra o erro e a lista continua igual, o modal de adicionar busca no idioma escolhido, marca a carta que já está na wishlist (mesmo em outra página) e "Você já tem" para carta com unidade na coleção, e adiciona sem recarregar; "Já consegui" leva a carta para a coleção e tira da lista, e cai para o inglês quando a carta não existe em português; filtros, ordem e página lidos da URL, selos que tiram o filtro, busca, tipo, raridade e ordem pelo painel, busca de uma letra que não vai para a API, filtro sem resultado com "Limpar filtros", paginação com o card de adicionar em todas as páginas, volta à página anterior quando a última carta da página sai, remover ou Já consegui com 25 cartas (duas páginas) traz a carta 24 para a página 1 e a 25 fica na página 2, adicionar com filtro recarrega a página; API fora do ar mostra o aviso e o "Tentar de novo" carrega a lista; Propostas mantém os cartões na tela enquanto atualiza depois de recusar e tira só a oferta que saiu do filtro, e a galeria abre num diálogo com todas as cartas de um lado; Aceitar diz no modal que a troca nasce e reserva as cartas, chama o PATCH e leva para `/trocas?aba=recebidas&status=PROPOSED`, e o aceite que falha (422) mostra a mensagem da API; oferta que virou troca (`tradeId`) mostra "Virou troca" e "Ver troca", sem Recusar nem Cancelar, e com a troca concluída (`tradeStatus`) mostra "Troca concluída" e leva às trocas concluídas; oferta em espera (`onHold`) não deixa aceitar e diz por quê, e quem ofertou ainda pode cancelar; oferta cancelada mostra o motivo (`cancelReason`); oferta recusada continua mostrando as cartas oferecidas; o anúncio com oferta aberta esconde o formulário, e o anúncio em troca mostra o selo e o aviso sem formulário, mas quem tem oferta em espera nele continua vendo "Você já fez uma oferta aqui"; o perfil público com a coleção vinda do MSW: busca longa demais na URL não vai para a API e o perfil aparece; 400 de filtro mostra "Filtro inválido" com o campo de busca; 404 e username inválido mostram "Colecionador não encontrado"; o catálogo avisa as palavras ignoradas da busca (e o aviso some quando a nova busca não ignora nada, ou quando a lista vem vazia), mostra "Cartas de ..." para só o nome do set e avisa a palavra ignorada junto com o nome do set (#214), e o sem resultado tem o termo, "Limpar busca", "Limpar filtros" com filtro, sem paginação, e "Voltar para a primeira página" numa página vazia além da primeira |
| Componente | `src/components/Aviso/Aviso.test.jsx`, `src/components/AcoesAnuncio/AcoesAnuncio.test.jsx`, `src/components/header/BuscaGeral.test.jsx`, `src/components/ConfirmModal/ConfirmModal.test.jsx`, `src/components/ConfirmacaoProvider/ConfirmacaoProvider.test.jsx`, `src/components/ToastProvider/ToastProvider.test.jsx`, `src/components/ErroCampo/ErroCampo.test.jsx`, `src/components/ImagemCarta/ImagemCarta.test.jsx`, `src/components/SessaoExpirada/SessaoExpirada.test.jsx`, `src/components/Abas/Abas.test.jsx`, `src/components/CartaoTroca/CartaoTroca.test.jsx`, `src/components/CartaAnuncio/CartaAnuncio.test.jsx`, `src/components/Perfil/Perfil.test.jsx` | o componente renderizado com a Testing Library, procurado pelo papel e pelo texto, como a pessoa vê; o modal de confirmação abre com o texto certo, confirmar devolve `true`, cancelar e Esc devolvem `false`; o toast aparece na região viva certa, some sozinho, fecha no X, e o `useAcao` dispara o toast de sucesso; a mensagem do `ErroCampo` vira a descrição acessível do campo; carta sem imagem, ou com imagem que falha, mostra o placeholder com a descrição, e uma imagem nova tenta carregar de novo; o aviso de sessão expirada mostra o toast e leva ao login guardando a página de origem; as `Abas` têm os papéis ARIA, o Tab para só na aba ativa e as setas, Home e End trocam de aba; a busca do topo descarta o rascunho ao trocar de página e só pesquisa sozinha na página de resultados; fechar um anúncio (com o PATCH no MSW) avisa o selo de pendências e pausar não, e o anúncio em troca pode ser pausado ou fechado; o cartão da troca nos três estados de confirmação (ninguém, você, o outro), "Confirmar recebimento" com o resumo no modal chamando `POST /trades/:id/accept`, a segunda confirmação concluindo, e Recusar troca e Cancelar troca depois de ter confirmado; o selo "Em troca" no cartão do marketplace; o resumo de trocas do perfil contando as que esperam a sua confirmação e o 409 ao desativar a conta com troca aberta |

Como está montado:

- Cada teste fica ao lado do arquivo testado, com `.test.js` (ou `.test.jsx`) no nome, e importa `describe`, `it`, `expect` e `vi` do `vitest`.
- O ambiente é o **jsdom**, um navegador de mentira dentro do Node, com `document`, `window` e `localStorage`.
- `src/test/setup.js` roda antes dos testes: completa o `<dialog>` do jsdom (que não tem `showModal()` nem `close()`) com o mínimo para o modal funcionar, cria um `window.matchMedia` falso (o jsdom não tem, e componentes como `GradeCartas`, `PainelFiltros` e `CartaInterativa` usam), liga as verificações do jest-dom (`toBeInTheDocument()` e afins), limpa a tela e o `localStorage` depois de cada teste e liga o **MSW** (`src/test/server.js`), que intercepta as requisições HTTP. Cada teste coloca as respostas falsas de que precisa com `server.use(...)` (veja `src/api/http.test.js`), e qualquer requisição sem resposta combinada é barrada: o teste falha na hora em vez de depender da API.
- `src/test/renderWithProviders.jsx` renderiza um componente dentro do que o `main.jsx` monta (roteador, toast, sessão e confirmação), com o `MemoryRouter` no lugar do `BrowserRouter`. O teste escolhe a URL inicial (`rota`) e a sessão (`service`). `src/test/sessaoFalsa.js` cria uma sessão de mentira com `criarSessaoFalsa()` (Ash logado) ou `criarSessaoFalsa(null)` (sem login), com `entrar()` e `logout()` para trocar a sessão no meio do teste.
- O `npm run build` não leva os arquivos de teste para o `dist`.

#### Cobertura do front

```bash
cd frontend
npm run test:coverage
```

Roda os mesmos testes do `npm test` medindo a cobertura com o `@vitest/coverage-v8`. A tabela aparece no terminal, e o relatório arquivo por arquivo, com as linhas cobertas em verde, fica em `frontend/coverage/index.html`. Entram na conta os `.js` e `.jsx` de `frontend/src`; ficam de fora os testes, a pasta `src/test` e o `main.jsx`, que só monta o app.

| Métrica | Medido | Mínimo exigido |
|---|---|---|
| Linhas | 42,7% | 40% |
| Comandos | 43,0% | 41% |
| Funções | 37,7% | 35% |
| Ramos (if/else) | 38,0% | 35% |

Números de 19/11/2026, com 266 testes. O mínimo segue a mesma regra do backend: o valor medido menos uns 2 pontos, arredondado para baixo, para uma mudança pequena não quebrar a CI. Ele fica em `frontend/vite.config.js` (`test.coverage.thresholds`); abaixo dele, o `npm run test:coverage` termina com erro e a CI fica vermelha. A cobertura do front é mais baixa que a do backend porque a maioria das páginas ainda não tem teste próprio (as testadas mostram o padrão para as outras); quem acrescentar testes pode subir o mínimo.

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

Números de 15/11/2026, medidos na CI, com 682 testes de unidade e 95 de integração. O mínimo é o valor medido menos uns 2 pontos, para uma mudança pequena não quebrar a CI. Abaixo dele, o `npm run test:coverage` termina com erro, a CI fica vermelha e o deploy não sai. A meta é manter os números e subir o mínimo dos ramos aos poucos; 100% não é meta, porque incentiva teste que só pinta linha. A cobertura do front tem a tabela dela em [Cobertura do front](#cobertura-do-front).

A CI (GitHub Actions, `.github/workflows/ci.yml`) roda em toda PR para `develop` e `main` e em todo push na `develop`:

| Job | O que roda |
|---|---|
| `backend` | sobe um PostgreSQL de teste; `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm run build` e `npm run test:coverage` (unidade + integração, com o mínimo de cobertura). Mostra a tabela de cobertura no resumo da execução e guarda o relatório completo como artefato `coverage-backend` |
| `frontend` | `npm ci`, `npm run lint`, `npm run test:coverage` (Vitest, com o mínimo de cobertura) e `npm run build`. Mostra a tabela de cobertura no resumo da execução e guarda o relatório completo como artefato `coverage-frontend` |

Os dois precisam passar para mergear. Na `main`, quem chama a CI é o workflow de deploy, antes de publicar (veja [Deploy](#deploy)).

### E2E com Cypress

E2E (ponta a ponta) é o topo da pirâmide: um navegador de verdade abre o PokeBox, entra, clica e confere a tela, com front, API e banco rodando juntos no Docker. São poucos testes, só dos caminhos que não podem quebrar. O Cypress fica na pasta `e2e/`, com o próprio `package.json`, para não pesar no `npm install` do front e do backend.

> **Atenção: o E2E apaga os dados de usuário do banco local.** Antes de cada arquivo de teste, ele limpa usuários, coleções, wishlist, anúncios, ofertas e trocas e roda o seed de novo, como se fosse um `make reset` só dessas tabelas. O catálogo de cartas (`Card`, `CardCache`, `CatalogCard`, `CatalogSet` e `CatalogFilterValue`) fica. Se você tem dados criados à mão que quer guardar, não rode o E2E nesse banco. Por isso o reset tem uma trava: ele só roda com a variável `E2E_PERMITIR_RESET=1`; sem ela, o primeiro teste falha com uma mensagem explicando. O `make e2e` e o workflow da CI já ligam a variável.

```bash
docker compose up -d --build --wait
cd e2e
npm ci
E2E_PERMITIR_RESET=1 npx cypress run
```

`E2E_PERMITIR_RESET=1 npx cypress run` (ou `make e2e`, da raiz) roda sem janela, como a CI. `E2E_PERMITIR_RESET=1 npx cypress open` abre a janela do Cypress para ver o teste rodando e escrever testes novos. Os prints das falhas ficam em `e2e/cypress/screenshots`.

Como está montado:

- **Reset do banco**: a task `resetarBanco` (`e2e/cypress.config.js`) roda um `TRUNCATE ... RESTART IDENTITY CASCADE` nas tabelas de usuário direto no Postgres do container `tcg-db` e depois o seed dentro do container `tcg-backend` (`npx prisma db seed`). Não existe rota de reset na API: uma rota que apaga o banco seria perigosa se escapasse para produção. Leva uns 2 a 3 segundos.
- **Senhas**: vêm do `.env` da raiz (`SEED_ADMIN_PASSWORD` e `SEED_DEMO_PASSWORD`), o mesmo que o compose usa, e são lidas no teste com `cy.env()`. Nenhuma senha fica escrita nos testes.
- **Login rápido**: `cy.login(email)` entra pela API e guarda o token (`pokebox.token`) e o usuário (`pokebox.user`) com `cy.session`, que reaproveita o login nos testes seguintes. O `validate` chama `GET /auth/me`; depois de um reset, o token antigo deixa de valer e o login é refeito. `cy.loginAdmin()` faz o mesmo com o admin.
- **Seletores**: pelo papel, rótulo e texto que a pessoa vê (`findByRole`, `findByLabelText`, da Testing Library para Cypress). Nada de classe CSS e nada de `cy.wait(ms)`.
- Na falha, o Cypress tenta o teste mais uma vez (`retries.runMode: 1`).
- Por que Cypress: é a ferramenta da aula. O Playwright seria a alternativa (mais rápido e com vários navegadores), mas o time ficou com o que estudou.

| Arquivo | O que cobre |
|---|---|
| `auth.cy.js` | login pela tela com o ash (cai na home com o menu do usuário), senha errada mostra "E-mail ou senha inválidos", página privada sem sessão manda para o login, entrar pela tela depois disso volta para a página privada, `cy.login` reaproveitando a sessão |
| `colecao.cy.js` | o ash abre o Bulbasaur do Base Set (`/cards/base1-44`), adiciona à coleção com os valores padrão, vê "Carta adicionada à coleção." e a linha do Bulbasaur em Minha coleção |
| `wishlist.cy.js` | o ash remove o Zapdos em `/procuro` e confirma no modal (sobram 3 cartas); depois abre o Squirtle do Base Set (`/cards/base1-63`), clica em "Quero esta carta" e vê o Squirtle na wishlist |
| `anuncio.cy.js` | o ash anuncia 1 Rowlet pela linha da coleção, vê "Anúncio criado. Veja em Meus anúncios." e acha o anúncio buscando "rowlet" no marketplace |
| `troca.cy.js` | a troca inteira com dois usuários: o ash anuncia o Rowlet (o `id` vem da resposta do `POST /listings`, com `cy.intercept`), a misty oferece 1 Psyduck, o ash aceita (o modal avisa que a troca nasce) e cai em Trocas com a troca já criada, a misty vê "Virou troca" na oferta (sem "Cancelar oferta"), abre "Ver troca" e confirma o recebimento, o ash vê "@misty já confirmou" e confirma, e o Rowlet aparece na coleção da misty e o Psyduck na do ash |
| `admin.cy.js` | o admin abre o anúncio do Blastoise da misty pelo marketplace, bloqueia na caixa "Moderação do anúncio" (confirmando no modal), e o anúncio some da busca "blastoise" |

Cada arquivo roda sozinho (`npx cypress run --spec cypress/e2e/troca.cy.js`). Nos arquivos dos fluxos, o reset roda antes de **cada** teste (`beforeEach`), e não só uma vez por arquivo: o Cypress não repete o `before` quando tenta um teste de novo, e uma segunda tentativa que começasse no meio de uma troca acharia o banco sujo. Para achar um pedaço da tela sem papel próprio, os componentes ganharam três atributos só para teste: `data-cy="item-wishlist"` (`ItemWishlist`), `data-cy="cartao-oferta"` (`CartaoOferta`) e `data-cy="cartao-troca"` (`CartaoTroca`). Quem mudar esses componentes mantém os atributos.

A suíte inteira (6 arquivos, 11 testes) leva uns 40 segundos no computador, com o compose já no ar.

Na CI, o workflow `E2E` (`.github/workflows/e2e.yml`) roda em toda PR para `develop` e `main` e pode ser disparado à mão na aba Actions. Ele cria um `.env` com valores só de teste (escritos no próprio workflow, sem secrets), sobe o compose, espera o front e a API responderem e roda o Cypress no Chrome. Se falhar, guarda os prints e o vídeo no artefato `cypress-falhas` (7 dias) e mostra os logs da API. Ele não é check obrigatório por enquanto.

A página da carta e o "adicionar à coleção/wishlist" dependem da TCGdex num banco novo como o da CI (o seed não preenche `CardCache` nem `CatalogCard`): no E2E, isso é o `colecao.cy.js` e a parte "adicionar" do `wishlist.cy.js`. Os runners do GitHub têm internet. Nesses dois testes, a primeira conferência espera até 15 s (a API pode levar até 8 s esperando a TCGdex, e o Cypress espera 4 s por padrão), e o `retries` cobre uma falha passageira. O teste de remover da wishlist confere um item a menos do que havia, sem depender de quantos itens o seed põe na wishlist do ash. Login, rota privada, a lista da coleção, marketplace, anúncio, oferta, troca, remover da wishlist e moderação usam só o banco. Os testes não usam o painel de filtros do marketplace, que também chama a TCGdex.

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

**Roteiro para a apresentação:** com `make traces`, `ash` aceita a oferta da `misty` (a troca nasce), a `misty` confirma o recebimento e o `ash` confirma também (a segunda confirmação conclui). No Jaeger, a operação `trade.accept` da segunda confirmação mostra a transação (`BEGIN` ... `COMMIT`), as travas `SELECT ... FOR UPDATE` da RN-08 em ordem e o tempo de cada consulta. Depois, abra um `GET /cards/:id` de uma carta nunca vista (span da TCGdex, centenas de ms) e o mesmo id de novo (sai do cache em memória, sem span da TCGdex).

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

**Paginação opcional nas listas (#77).** `GET /collection`, `GET /wishlist`, `GET /users/:username/collection`, `GET /listings/me`, `GET /offers/me` e `GET /trades/me` respondem como sempre quando não recebem nenhum parâmetro novo: a lista inteira, no mesmo formato. Qualquer parâmetro novo (`page`, `limit`, um filtro, `sort` ou `side`) liga a paginação, mesmo sem `page` (aí vem a página 1). A resposta paginada é igual à do `GET /listings`: `{ "success": true, "data": { "items": [] }, "pagination": { "page": 1, "limit": 20, "hasNextPage": false } }`, sem total. `limit` padrão 20, máximo 100 (acima disso → **400** com `details`). Sem `sort`, a ordem é a de antes, com uma exceção: em `GET /offers/me` e `GET /trades/me`, as recebidas sem `status` trazem as pendentes primeiro, paginadas ou não (#199); o `id` desempata para nenhum item repetir ou sumir entre as páginas.

### Autenticação e conta

| Rota | | O que faz |
|---|---|---|
| `POST /auth/register` | | cria conta (`username`, `name`, `email`, `password`) e devolve o token |
| `POST /auth/login` | | login com e-mail e senha, devolve o token |
| `GET /auth/me` | 🔒 | dados do usuário logado |
| `GET /auth/admin-check` | 🔒 ADMIN | testa o acesso de admin |
| `PATCH /user/me` | 🔒 | edita nome, telefone e endereço |
| `DELETE /user/me` | 🔒 | desativa a conta (soft delete). Com troca em andamento → **409** ("Conclua ou cancele suas trocas antes de desativar a conta."). Sem troca, cancela as ofertas abertas feitas e recebidas (`cancelReason: ACCOUNT_DEACTIVATED`) e fecha os anúncios abertos, na mesma transação |

### Cartas (catálogo)

| Rota | | O que faz |
|---|---|---|
| `GET /cards?name=&page=&limit=&lang=&type=&rarity=&set=&category=&sort=&order=` | | busca cartas, com paginação. Entende nome de set e ignora palavras que não acham nada: `charizard base` traz os Charizard com o do Base Set primeiro, e `charizard base x pipi popo` ainda traz os Charizard. O resultado vem ordenado por relevância, cada carta traz `set: { id, name }` e `number`, e a resposta traz `search: { name, sets, ignored }` dizendo como a busca foi entendida. **Catálogo local (#78):** com o catálogo sincronizado (`npm run catalog:sync`), a busca por nome roda no nosso banco, sem chamar a TCGdex: tolera erro de digitação (`charzard`, `pikachuu`), ignora acento (`flabebe` acha `Flabébé`) e continua funcionando com a TCGdex fora do ar. Palavra curta pode achar um nome parecido (`popo` acha `Po Town`) em vez de ir para `ignored`. Sem nome e com filtro de `type`, `rarity` ou `category`, a busca também roda no banco (#158). Só num idioma ainda não sincronizado (hoje `en` e `pt` são) ela vai à TCGdex como antes. Cartas com id que o detalhe não aceita (fora de letras, números, ponto e hífen) ficam fora da lista: hoje são só as Unown "!" e "?" do set `exu`; por isso uma página pode vir com uma carta a menos. **Filtros (#75):** `type`, `rarity`, `set` (id do set) e `category` filtram pelo valor exato, com ou sem nome; a caixa não importa (`fire` vira `Fire`), e valor que não existe no idioma responde 400 com `details`. `sort=name` com `order=asc` ou `desc` ordena pelo nome no lugar da relevância. **Rankings (#92):** `sort=recent` (sets mais novos primeiro), `sort=wanted` (mais wishlists de contas ativas, com `wishlistCount` em cada carta) e `sort=traded` (mais unidades em trocas concluídas, com `tradeCount`) usam o catálogo local e vêm em ordem decrescente por padrão (`order=asc` inverte); empate segue pelo nome e pelo id, então a página 2 não repete carta. Num idioma sem catálogo local, o ranking responde 200 com lista vazia, sem chamar a TCGdex. `sort` fora de `name`, `recent`, `wanted` e `traded` → **400** com `details` |
| `GET /cards/filters?lang=` | | opções dos filtros do catálogo no idioma pedido: `{ types, rarities, categories, sets: [{ id, name }] }`. Os valores vêm traduzidos pela TCGdex (em `pt`, `Fire` vira `Fogo`) e os sets na ordem de lançamento. Em `en` e `pt` sai do banco, gravado pelo sync (#158), e a lista de sets traz só os que têm carta naquele idioma: a TCGdex lista em `pt` coleções sem nenhuma carta traduzida (Coleção Básica, as EX, Diamante & Pérola...), que antes apareciam no filtro e não traziam nada (#196). Nos outros idiomas fica 1 dia em memória; com a TCGdex fora do ar usa a última lista guardada, e sem nenhuma guardada → 502 |
| `GET /cards/:id` | 🔓 | detalhe da carta (ataques, variantes, preço de referência) e os anúncios ativos dela. Sai do banco sempre que ele tem a carta (em `en` e `pt`, todas depois do sync, #192); o preço de referência pode ter até um dia. Ataque ou habilidade sem tradução na TCGdex (comum nas cartas Black & White em `pt`) vem com `name: null`, e a tela mostra "Nome não traduzido" (antes, a carta inteira dava 502); com login, traz `user`: `inCollection` (quantas você tem), `inWishlist`, `onTradeList` (se você tem anúncio ativo dela; pausado não conta) e `myListing` (`{ id, status }` do seu anúncio aberto dela, ativo ou pausado, preferindo o ativo e, no empate, o mais recente; `null` se não houver) |

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
| `GET /listings?q=&cardId=&username=&condition=&finish=&firstEdition=&setId=&type=&rarity=&sort=&page=&limit=` | | anúncios ativos e, no fim (depois de todos os ativos, inclusive entre páginas), os **Em troca** (`IN_TRADE`), com `hasNextPage`. A ordenação vale dentro de cada grupo. `q` busca por palavras no nome da carta ou do set (`charizard base` acha o Charizard do Base Set). Os filtros se somam e não diferenciam maiúscula (`type=fire`, `rarity=rare`, `condition=near_mint`); `sort` é `recent` (padrão), `oldest` ou `name`. Valor inválido → **400** com `details` |
| `GET /listings/me?page=&limit=` | 🔒 | meus anúncios, em qualquer status, mais novos primeiro. Paginação opcional |
| `GET /listings/:id` | 🔓 | detalhe; ativo e Em troca aparecem para todos (Em troca sem nenhum dado da negociação); pausado, fechado ou bloqueado só para o dono e para o ADMIN |
| `POST /listings` | 🔒 | anuncia um item da minha coleção: `collectionItemId`, `quantity`, `description?` |
| `PATCH /listings/:id` | 🔒 | muda `quantity`, `description` ou `status` (`ACTIVE`, `PAUSED`, `CLOSED`); ADMIN só bloqueia (`BLOCKED`) ou desbloqueia. Fechar ou bloquear cancela as ofertas abertas (`cancelReason` `LISTING_CLOSED` ou `LISTING_BLOCKED`); diminuir ou pausar não cancela nada (as que não cabem ficam em espera). Anúncio Em troca: o dono pausa ou fecha, mas não muda a quantidade nem reativa (**409**); `IN_TRADE` ninguém pede (**422**) |

### Ofertas de troca

| Rota | | O que faz |
|---|---|---|
| `POST /listings/:id/offers` | 🔒 | faz uma oferta num anúncio: `quantity` (quantas cartas do anúncio quero), `message?` e `items` (de 1 a 20 cartas da minha coleção, cada uma com `collectionItemId` e `quantity`) |
| `GET /offers/me?status=&side=&page=&limit=` | 🔒 | minhas ofertas: `sent` (que fiz) e `received` (nos meus anúncios), mais novas primeiro. Em `received` sem `status`, as que esperam sua resposta (`PROPOSED`) vêm antes das outras, também com paginação: a página 1 traz as pendentes mesmo que sejam antigas, e a página seguinte continua de onde a anterior parou (#199). Com `side=sent` ou `side=received`, vem só aquele lado em `{ items }` paginado; `page`/`limit` sem `side` → **400**. `status` sozinho não pagina. Em `received` sem `status`, as **em espera** vêm depois das que dá para aceitar e antes das respondidas. Cada oferta traz `tradeId` (id da troca criada no aceite, ou `null`), `tradeStatus` (situação dessa troca: `PROPOSED`, `ACCEPTED`, `REJECTED`, `CANCELED` ou `null`), `items` (as cartas oferecidas, com a cópia gravada na oferta, inclusive depois de recusada, cancelada ou trocada; `collectionItemId` vira `null` se o item sair da coleção), `cancelReason` (`PROPOSER`, `LISTING_CLOSED`, `LISTING_BLOCKED`, `LISTING_TRADED`, `ACCOUNT_DEACTIVATED` ou `null`) e `onHold` (`true` quando está `PROPOSED` mas não dá para aceitar agora: anúncio Em troca ou com menos unidades do que ela pede) |
| `GET /offers/:id` | 🔒 | detalhe; só quem fez a oferta e o dono do anúncio veem (outros → 404) |
| `PATCH /offers/:id/status` | 🔒 | `{ status }`: o dono do anúncio aceita (`ACCEPTED`) ou recusa (`REJECTED`); quem fez a oferta cancela (`CANCELED`). **Aceitar já cria a troca** na mesma transação e a resposta traz o `tradeId`; se a troca não puder nascer (cartas indisponíveis, anúncio Em troca, oferta em espera), **422** e nada muda. Oferta aceita não muda mais (**409**) |

### Trocas

A troca tem 3 passos (#213): **1.** quem quer a carta faz a oferta; **2.** o dono do anúncio aceita e a troca **já nasce** (as cartas dos dois lados ficam reservadas, o anúncio perde a quantidade da oferta e, em 0, fica **Em troca**); **3.** **as duas partes confirmam o recebimento**, e a segunda confirmação faz as cartas mudarem de dono (tudo ou nada). Até concluir, qualquer parte desiste, mesmo depois de ter confirmado: o dono recusa, quem ofertou cancela, a reserva é liberada e a quantidade volta aos anúncios.

| Rota | | O que faz |
|---|---|---|
| `POST /trades` | 🔒 | `{ offerId }` (rota do PDF). Como o aceite já cria a troca, oferta que já virou troca → **409**; oferta que não está aceita → **422** |
| `GET /trades/me?status=&side=&page=&limit=` | 🔒 | minhas trocas: `sent` (fiz a oferta) e `received` (meus anúncios), mais novas primeiro. `side` e as pendentes primeiro em `received` funcionam como em `GET /offers/me` |
| `GET /trades/:id` | 🔒 | detalhe; só as duas partes veem (outros, inclusive ADMIN → 403) |
| `POST /trades/:id/accept` | 🔒 | confirma o recebimento, para as **duas partes**: a primeira só grava a data (`proposerConfirmedAt` ou `recipientConfirmedAt`); a segunda conclui e as cartas trocam de dono, tudo ou nada. Confirmar de novo ou troca finalizada → **409** |
| `POST /trades/:id/reject` | 🔒 | o dono do anúncio recusa (mesmo depois de confirmar); a reserva é liberada e a quantidade volta aos anúncios ainda abertos |
| `POST /trades/:id/cancel` | 🔒 | quem fez a oferta cancela (mesmo depois de confirmar); a reserva é liberada e a quantidade volta aos anúncios ainda abertos |

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
| **RN-05** Anúncios (adaptada: só trocas) | Só anuncia item da **própria** coleção (**403**). A soma das quantidades dos anúncios abertos (ativos, pausados e Em troca) de um item não passa do disponível (quantidade menos reservada); senão **422**. Vale ao criar, ao aumentar a quantidade e ao desbloquear. A coleção também não deixa baixar a quantidade abaixo do que está anunciado (**422**). Anunciar **não reserva**: a reserva fica para a troca (RN-07/08). Pedidos ao mesmo tempo no mesmo item são tratados um de cada vez (trava no banco). Anúncio cujas unidades estão todas numa troca em andamento fica **Em troca** (`IN_TRADE`, quantidade 0): continua público, vai para o fim do marketplace e não recebe oferta (**422**); o dono pausa ou fecha, mas não muda a quantidade nem reativa (**409**); o ADMIN bloqueia. Se a troca cair, a quantidade volta e ele volta a ativo (pausado continua pausado; fechado ou bloqueado não reabre); se a troca concluir e não houver outra troca aberta nele, fecha (vale também para o pausado que ficou com 0). |
| **RN-06** Ofertas | Só faz oferta em anúncio **ativo** de outra pessoa (próprio anúncio ou anúncio Em troca → **422**; pausado, fechado ou bloqueado → **404**). Pede no máximo a quantidade do anúncio e oferece só cartas da **própria** coleção (**403**) que caibam no disponível (**422**). Uma oferta aberta por pessoa em cada anúncio (**409**). Só o **dono do anúncio** aceita ou recusa; só **quem fez** cancela (**403**, inclusive para ADMIN). **Aceitar cria a troca** na mesma transação (RN-07/RN-08); se não der, **422** e nada muda. Oferta aceita **não muda mais** (**409**: para desistir, recuse ou cancele a troca); recusada ou cancelada também não (**422**) nem volta para `PROPOSED`. As outras ofertas do anúncio não são canceladas quando a troca nasce: as que não cabem ficam **em espera** (`onHold`; aceitar → **422**, quem fez pode cancelar) e voltam a valer se a troca cair. Recusar ou cancelar solta as cartas oferecidas, mas a oferta guarda uma cópia delas para o histórico (#217). Fechar ou bloquear o anúncio cancela as ofertas abertas dele (desbloquear não traz de volta); diminuir ou pausar não cancela nenhuma. Toda oferta cancelada guarda o motivo (`cancelReason`): quem ofertou, anúncio fechado, bloqueado, trocado com outra pessoa ou conta desativada. A oferta **não reserva** cartas, mas o aceite confere de novo: se o dono baixou o anúncio abaixo do que a oferta pede, ou se quem ofertou não tem mais as cartas, o aceite é recusado (**422**). Carta que está numa oferta aberta não pode ser apagada da coleção (**409**); depois que a oferta encerra, pode, e a oferta continua mostrando a carta. |
| **RN-07** Troca atômica | A troca nasce quando o dono aceita a oferta. **As duas partes confirmam o recebimento** (`POST /trades/:id/accept`); a primeira só grava a data dela. A **segunda confirmação** roda numa **transação só**: trava as cartas, confere de novo que cada uma ainda é de quem entrega e está reservada, tira de quem entrega e soma em quem recebe (no item igual em carta, condição e variante; se não houver, cria um item público). Se qualquer passo falhar, **nada muda**. Quem entrega fica com o item, mesmo que chegue a 0. Confirmar de novo → **409**; quem não é parte → **403**. Até concluir, o dono recusa e quem fez a oferta cancela (**403** no papel errado), mesmo depois de ter confirmado. Troca finalizada não muda mais (**409**). Uma troca por oferta (**409**). |
| **RN-08** Reserva | Quando a troca nasce (no aceite da oferta), as cartas dos dois lados ficam **reservadas**: nenhuma outra negociação consegue usá-las (anunciar, ofertar, aceitar outra oferta → **422**), nem dá para baixar a quantidade abaixo do reservado (**422**) ou apagar o item (**409**). No mesmo momento, o anúncio perde só a quantidade da oferta (em 0, fica **Em troca**) e os anúncios de quem ofertou que passariam do disponível são reduzidos (em 0, também Em troca). Quanto saiu de cada anúncio fica guardado. Recusar ou cancelar a troca libera a reserva e devolve essa quantidade a cada anúncio ainda aberto: as coleções ficam exatamente como antes. Dois invariantes valem sempre e são provados por teste em todos os caminhos: a reserva de cada item é a soma das trocas abertas que o usam, e anunciado + reservado ≤ quantidade. Pedidos ao mesmo tempo na mesma troca: um passa, o outro recebe **409**. A **condição** de um item não muda enquanto ele está num anúncio aberto, numa oferta aberta ou aceita ou numa troca aberta (**409**): assim o que foi anunciado e oferecido é o que chega. |
| **RN-09** Snapshot local da carta | Quando uma carta entra numa coleção ou wishlist, nome, set, número, imagem, raridade, tipos e preço de referência são gravados na tabela `Card` (RN-01). Coleção, wishlist, perfil público e marketplace leem dali, sem chamar a TCGdex: com ela fora do ar, essas telas continuam funcionando. O detalhe completo (ataques, habilidades) fica no `CardCache`, preenchido pelo sync em `en` e `pt` (#192), e responde mesmo com a TCGdex fora (veja "Cache das cartas" abaixo). |
| **RN-10** Privacidade | Item com `isPublic: false` não aparece no perfil público. O perfil público nunca mostra e-mail, reserva nem dados internos. Conta desativada ou suspensa → **404**. |
| **RN-11** Coleção limpa a wishlist | Carta que entra na coleção sai da wishlist da pessoa, na mesma transação: vale ao adicionar (`POST /collection`), ao receber numa troca concluída (`POST /trades/:id/accept`) e quando um item zerado volta a ter quantidade (`PATCH /collection/:id`). Como a wishlist não tem variante, qualquer condição ou acabamento conta. |
| **RN-12** Wishlist só do que falta | Carta que você já tem na coleção (quantidade maior que 0, em qualquer variante, pública ou privada) não entra na wishlist (**409**). Item zerado não conta. Junto com a RN-11, a wishlist guarda só o que a pessoa ainda não tem. |

Outras regras que já valem:

- **Variante da carta:** cada item tem `finish` (`NORMAL`, `HOLO`, `REVERSE`) e `firstEdition`. Só aceita combinações que a carta realmente tem na TCGdex (senão **422**).
- **Condição:** `MINT`, `NEAR_MINT`, `EXCELLENT`, `GOOD`, `LIGHT_PLAYED`, `PLAYED` ou `POOR`.
- **Conta:** login de conta suspensa ou inativa → **403**. Excluir a conta só desativa (soft delete); o histórico fica. Com troca em andamento → **409** ("Conclua ou cancele suas trocas antes de desativar a conta."); sem troca, as ofertas abertas feitas e recebidas são canceladas e os anúncios abertos fechados, na mesma transação.
- **Cache das cartas:** o detalhe de uma carta sai do banco (`CardCache`) sempre que ele tem a carta. Em `en` e `pt`, o sync já guarda o detalhe de todas (#192); nos outros idiomas, a carta é buscada na TCGdex na primeira vez e guardada. Passadas 24 h, a resposta continua saindo do banco na hora, e a cópia é atualizada pela TCGdex por trás, uma vez só mesmo com vários pedidos ao mesmo tempo (é assim que o preço de referência se mantém em dia; ele pode ter até um dia, ou a data do último sync numa carta que ninguém abriu). Em memória, o detalhe fica 1 h. Antes de desistir, a API tenta de novo até 2 vezes quando a TCGdex responde 502, 503 ou 504 ou a conexão falha. Se a TCGdex cair, a cópia guardada continua respondendo. A busca `GET /cards` guarda o resultado em memória por 10 min e a lista de sets por 1 dia (trocar de página não chama a TCGdex de novo); depois desse prazo o resultado continua guardado e é usado se a TCGdex cair. Sem nenhuma cópia, responde **502** (fora do ar) ou **504** (demorou mais de 8 s), e o front mostra a mensagem com o botão **"Tentar de novo"** no catálogo e no detalhe da carta. O cache é gravado com o id oficial da carta, mesmo que a URL use outra caixa (`/cards/BASE1-4` grava e atualiza o preço de `base1-4`), e a leitura acha a carta em qualquer caixa (`%` e `_` no id valem como letra, não como curinga).
- **Preço de referência:** cada carta guarda o preço de mercado da TCGdex (TCGplayer em USD ou Cardmarket em EUR), atualizado quando a carta é consultada de novo. É **só informativo**.
- **Status do anúncio:** o dono alterna entre ativo e pausado e pode fechar; anúncio fechado não volta. Em troca é posto e tirado pelo sistema (RN-05). Só o ADMIN bloqueia, e só ele desbloqueia (volta como pausado). Um item que já foi anunciado não pode mais ser apagado da coleção, porque o anúncio fica no histórico; para tirá-lo do perfil, zere a quantidade.
- **Integridade no banco:** chaves estrangeiras, uniques e CHECKs em todas as tabelas. Lista completa em [`backend/docs/db.md`](backend/docs/db.md).

### Adaptação: só trocas

O enunciado previa anúncios de venda e de troca. **O time decidiu que o PokeBox é só de trocas** (sem venda nem pagamento). Por isso:

- o anúncio não tem tipo nem preço;
- a oferta diz **quais cartas da coleção** o proponente dá em troca;
- a RN-05 vira "só anuncia o que tem disponível para troca".

### Limitações conhecidas

- No plano gratuito do Render, a API dorme depois de 15 minutos sem uso, e a primeira chamada seguinte leva cerca de 2 minutos (a imagem sobe e roda o `prisma migrate deploy` antes de atender). Para isso não acontecer durante a avaliação, um monitor externo gratuito (UptimeRobot) chama `GET /health` a cada 5 minutos e avisa por e-mail se a API cair. Antes isso era um workflow agendado no GitHub Actions, a cada 10 minutos; ele foi removido porque o GitHub atrasa e descarta agendamentos quando a fila está cheia, e na prática rodou 1 vez em 5 horas. Não custa nada: um serviço ligado o mês todo cabe nas 750 h grátis do Render (não criar outro serviço grátis na mesma conta) e o `/health` não consulta o banco, então o Neon continua dormindo. O cache de cartas em memória some quando ela dorme; o cache no banco continua.
- Em produção, nenhuma senha do seed é pública. A do `ash` e da `misty` (`SEED_DEMO_PASSWORD`) é passada a quem for avaliar fora do GitHub; a do `admin` (`SEED_ADMIN_PASSWORD`) fica só com o time. O login e o cadastro param depois de 20 tentativas sem sucesso para o mesmo e-mail em 15 minutos.

- Não há prazo para confirmar o recebimento: uma troca em andamento segura as cartas reservadas até as duas partes confirmarem ou alguém desistir (o dono recusa ou quem ofertou cancela). Também não dá para desfazer uma confirmação; quem mudou de ideia desiste da troca.
- Uma troca recusada ou cancelada não gera outra troca a partir da mesma oferta: é preciso fazer uma oferta nova. A quantidade volta só para anúncio ainda aberto; anúncio fechado ou bloqueado no meio-tempo não reabre.
- Trocas abertas criadas antes da #213 não têm o registro de quanto tiraram de cada anúncio: se caírem, só a reserva volta (os anúncios delas já estavam fechados).
- Conta com troca em andamento não pode ser desativada (409); é preciso concluir ou cancelar antes.

## MVP do front (PR rascunho, não mergear)

A branch `feat/mvp-front` liga as telas do front a **todas** as rotas da API, sem firula, para demonstrar o app ponta a ponta e servir de referência para as telas do board (#22 a #27). Ela inclui a tela de perfil da #50 ligada à API.

```bash
cd frontend && npm install && npm run dev
```

Abra `http://localhost:5173`, entre com um usuário do seed e use o menu: Cards (catálogo), Marketplace, Coleção, Wishlist, Anúncios, Propostas, Trocas e Meu perfil. Para mostrar uma troca, use duas janelas (uma normal e uma anônima), uma com o `ash` e outra com a `misty`. Os erros aparecem perto de onde a pessoa está, com a mensagem da API e sem o código HTTP, por exemplo "Você já tem uma oferta aberta neste anúncio" (veja "Avisos e erros" abaixo).

As chamadas ficam em `frontend/src/api/` (axios com interceptores em `http.js`, uma função por rota).

**Estilos (#94):** as cores, fontes, espaçamentos e raios ficam como variáveis (tokens) em `frontend/src/styles/global.css`, e cada componente tem o seu CSS Module, com nomes de classe em português. Não use cor fixa fora desses tokens. O `login.css` usa os tokens do `global.css` direto (os apelidos em inglês, como `--text` e `--brand`, saíram), e foram apagados os arquivos sem uso: `App.css`, `context/themeContext.jsx`, `config.api.json` e `MainLayout.module.css`.

As páginas (`frontend/src/pages/`) só buscam os dados e montam a tela; cada bloco visual é um componente em `frontend/src/components/<Nome>/<Nome>.jsx`. Os reaproveitados entre páginas são `CabecalhoPagina`, `Paginacao`, `CartaMini`, `MiniaturaCarta`, `Abas`, `AbasNegociacao` e `GradeCartas`. A home mostra as 8 cartas mais desejadas (`GET /cards?sort=wanted`, só as que estão em pelo menos uma wishlist) e `SkeletonCard` enquanto carrega; sem nenhuma, a seção some, e com erro mostra o aviso com "Tentar de novo". Os três destaques da home abrem o catálogo ordenado por mais recentes, mais trocadas e mais desejadas (#92). A seção `GridCartas` da home e o catálogo (`/catalogo`) reutilizam o `GradeCartas`, que concentra a grade e seu CSS (quatro colunas na home e três no catálogo, no desktop). O `CartaCard` lê diretamente o formato da API (`image.small`, `set.name`) e o das outras telas (`imageUrl`, `setName`), sem adaptador. Em telas acima de 600px, o detalhe (`GET /cards/:id`) é buscado somente ao passar o mouse ou focar a carta; o painel de tipo, raridade, set, número e artista só aparece depois que os dados chegam. Até 600px, esse detalhe não é solicitado pela grade, pois o painel fica oculto. Os tipos em inglês e em português usam as mesmas cores, e as imagens não podem ser arrastadas.

**Cartas sem imagem (#128):** ~21% das cartas da TCGdex vêm com `image: null`. O componente `ImagemCarta` exibe um placeholder (`src/assets/placeholders/carta-placeholder.webp`) com nome, set e número, também usado como fallback quando a URL da imagem falha ao carregar. O detalhe da carta (`CartaInterativa`) mantém o próprio `<img>` por causa do skeleton e do tilt, e cai no mesmo placeholder quando a imagem falha.

**Catálogo e marketplace no mesmo modelo (#86, #87, #153).** As duas telas têm o mesmo layout: cabeçalho, barra com "Ordenar por" (e o idioma, no catálogo; trocar o idioma pesquisa na hora e limpa os filtros), filtros à esquerda e grade de três colunas. A busca por texto fica num campo só, no topo do site (veja "Busca geral no topo" abaixo). Os componentes são os mesmos: `PainelFiltros` com `GrupoFiltro` (opções em lista; no desktop aplicam na hora, e até 1023px abrem numa janela com "Limpar filtros" e "Ver resultados", que fecha pelo X, tocando fora ou com Esc sem aplicar), `SelosFiltro` (filtros ativos removíveis, traduzidos: "Tipo: Fogo", "Expansão: Base", "@ash"; "Limpar tudo" com dois ou mais), `GradeCartas` com esqueletos enquanto carrega, esqueleto também nos grupos de filtro que dependem da API (os outros continuam usáveis) e o aviso com "Tentar de novo" quando a API está fora do ar. Tudo fica na URL (F5 e link compartilhado mantêm a busca), e mudar um filtro volta para a página 1. No celular, o que se digita no filtro entra no rascunho na hora, então "Ver resultados" nunca perde o texto. Os nomes dos tipos e categorias ficam em `utils/rotulos.js`.

- **Catálogo (`/catalogo`):** filtros de categoria, tipo, raridade e expansão vindos de `GET /cards/filters` no idioma da busca; trocar o idioma limpa os filtros. Filtro da URL que não existe no idioma (`/catalogo?lang=pt&type=Fire`, expansão inventada) é ignorado em vez de virar erro 400: com filtro na URL, a busca espera as opções chegarem para conferir. Ordena por relevância, nome (A–Z, Z–A), mais recentes, mais trocadas ou mais desejadas (#92); nos rankings, o painel da carta mostra as wishlists ou as unidades trocadas.
- **Marketplace (`/marketplace`):** busca pelo nome da carta ou do set (`charizard base`); com menos de 2 letras ou números a busca não vai para a API e a tela avisa. Filtros de condição, acabamento, 1ª edição, tipo, raridade e colecionador (o nome de usuário só filtra quando é válido), e ordenação por mais novos, mais antigos ou nome. Valor inválido na URL (`condition=NM`, `sort=price`) é ignorado em vez de virar erro 400; se as raridades não carregam, o painel mostra o aviso com "Tentar de novo". Vindo da wishlist ou do detalhe (`/marketplace?cardId=base1-4`), aparece o selo "Carta: Charizard (base1-4)". Cada anúncio usa o `CartaCard` (com o painel de tipo, raridade e set no hover, sem chamada extra) e, embaixo, o `CartaAnuncio` mostra variante, condição, quantidade, dono e preço de referência (TCGplayer ou Cardmarket, nunca preço de venda). Logado, a carta que está na sua wishlist ganha "Na sua wishlist" e o seu anúncio aparece como "Seu anúncio". O filtro "Só cartas da minha wishlist" vale só para a página atual, porque o backend não tem esse parâmetro; enquanto a wishlist carrega a tela mostra os esqueletos, e se ela falhar mostra o aviso com "Tentar de novo" em vez de uma lista sem filtro.
- **Navegação:** o `ScrollAoTopo` leva ao topo ao abrir uma página nova, e guarda a posição de cada página: no Voltar do navegador ela volta para onde a pessoa estava, mesmo com a API lenta (reaplica a posição enquanto a lista carrega e para assim que a pessoa rola ou digita). O detalhe do anúncio só oferece "Tentar de novo" quando a API está fora do ar, não em 404. "Ver todas" da home leva ao `/catalogo` ordenado por mais desejadas.
- **Detalhe do anúncio (#165):** após enviar uma oferta, a pessoa vai para Propostas na aba Enviadas (`/propostas?aba=enviadas`) com o aviso "Oferta enviada para @dono." (o aviso não volta ao recarregar a página). No anúncio onde a pessoa já tem uma oferta aguardando resposta, a tela mostra "Você já fez uma oferta aqui" com o link "Ver em Propostas" no lugar do formulário. Vindo do marketplace, "Voltar ao marketplace" volta para a lista com os mesmos filtros.
- **Modal de confirmação (#82):** ações sem volta abrem um modal do próprio app (`ConfirmModal`, feito com o `<dialog>` do navegador, sem biblioteca) no lugar da caixinha cinza do `window.confirm`: apagar carta da coleção, fechar anúncio e desativar a conta. O foco começa em "Cancelar" (um Enter sem querer não apaga nada), fica preso no modal, Esc fecha sem agir, e ao fechar o foco volta ao botão que abriu. O `ConfirmacaoProvider` fica montado uma vez no `main.jsx`, e qualquer tela pede confirmação com o hook `useConfirmacao`: `const { pedir } = useConfirmacao()` e `if (!(await pedir({ titulo, mensagem, textoConfirmar, perigo }))) return;`. Para casos especiais (por exemplo, um campo dentro do modal), o `ConfirmModal` também pode ser usado direto, com as props `children` e `confirmarDesativado`.
- **Detalhe do anúncio: dono e moderação (#167):** o dono vê na própria página do anúncio os botões Pausar, Ativar e Fechar (o componente `AcoesAnuncio`, o mesmo da tabela de Meus anúncios; Fechar pede confirmação no modal) e quantas ofertas estão aguardando resposta ("2 ofertas aguardando sua resposta", com link para Propostas). Anúncio fechado ou bloqueado não mostra botões, só a frase do motivo. Para o ADMIN, Bloquear e Desbloquear agora pedem confirmação com o `@` do dono e a consequência (bloquear cancela as ofertas; desbloquear volta como pausado).
- **Atalho para anunciar no detalhe da carta (#164):** no detalhe da carta (`/cards/:id`), o bloco "Sua coleção" mostra "Anunciar esta carta" para quem tem a carta e não tem anúncio aberto (ativo ou pausado) dela. O botão abre o `ConfirmModal` (o mesmo `<dialog>` da #82, só com o botão "Fechar") com as cópias livres da carta: com uma, mostra a variante e a condição; com várias, pergunta "Qual cópia?". O formulário é o mesmo `FormNovoAnuncio` da coleção. Ao criar, o modal fecha, o toast diz "Anúncio criado." e a página recarrega; erro da API aparece dentro do modal. Quem já tem anúncio ativo ou pausado da carta vê "Você tem um anúncio ativo desta carta." ou "Você tem um anúncio pausado desta carta." e "Ver meu anúncio", que leva direto ao anúncio em `/marketplace/:id` (o dono abre o próprio anúncio pausado). O id vem de `user.myListing` em `GET /cards/:id`.
- **Propostas e trocas com confirmação (#168):** Aceitar, Recusar e Cancelar oferta (em `/propostas`) e Concluir, Recusar e Cancelar troca (em `/trocas`) pedem confirmação no modal antes de agir, com o `@` da outra pessoa e o que acontece depois. "Concluir troca" mostra o resumo do que cada lado dá e recebe ("Você dá: 1× Pikachu VMAX. Você recebe: 1× Basic Water Energy."). O botão de sair do modal se chama "Voltar", para não confundir com "Cancelar oferta". Desde a #213, "Concluir troca" virou "Confirmar recebimento" e "Criar troca" saiu (veja "Troca redonda" abaixo).
- **Perfil: máscaras, validação e desativar com o username (#172):** em "Minhas informações", celular e CEP ganham máscara enquanto se digita e na leitura (`(11) 91234-5678`, `01001-000`), e o estado virou uma lista com as 27 siglas. Antes de chamar a API, o front confere as mesmas regras do backend (celular com 10 ou 11 dígitos, CEP com 8, nome com 2 a 120 letras, tamanho máximo dos campos de endereço): com erro, a mensagem aparece embaixo do campo, nada é enviado e o painel continua em edição; o erro some quando a pessoa altera o campo. Telefone e CEP vão para a API só com os dígitos, e salvar sem mudar nada não chama a API. As máscaras são funções próprias (`utils/mascaras.js`), porque o `react-input-mask` não funciona com o React 19 (usa o `findDOMNode`, que o React 19 removeu) e saiu do `package.json`. "Meu perfil" tem o link "Ver como os outros me veem" (abre `/u/<username>`) e, para ADMIN, o selo "Administrador". Desativar a conta abre o modal pedindo para digitar o próprio username: o botão só libera com o nome certo, e fechar o modal limpa o que foi digitado. A busca de endereço pelo CEP (ViaCEP) ainda não entrou.
- **Avisos e erros (#176):** o que dá certo aparece num **toast**, um aviso pequeno no canto da tela (embaixo no celular, em cima à direita no desktop) que some sozinho em 4 segundos (erro em 8) e tem o botão de fechar. Ele é próprio, sem biblioteca: o `ToastProvider` fica montado uma vez no `main.jsx` e qualquer componente usa `const toast = useToast()` e `toast.sucesso(...)`, `toast.info(...)`, `toast.aviso(...)` ou `toast.erro(...)`. As duas regiões vivas (`role="status"` para sucesso, info e aviso, `role="alert"` para erro) existem desde o início, para o leitor de tela ler a mensagem quando ela aparece, e a animação de entrada some com "reduzir movimento" ligado. O `useAcao` mostra o toast sozinho quando a ação recebe uma mensagem ("Carta adicionada à coleção."; tirar da wishlist usa o toast de aviso). Os erros continuam no componente `Aviso`, perto do formulário, e passam pela função `mensagemAmigavel` (`src/api/mensagens.js`): sem conexão vira "Não conseguimos falar com o servidor...", erro 500 ou mais vira "Algo deu errado do nosso lado...", e nos outros casos fica a mensagem da API (sem ela, um texto padrão para 403, 404 e o resto). O código HTTP não aparece mais para quem usa. Toda página que carrega dados mostra "Tentar de novo" quando a API está fora do ar ou responde 500.
- **Erro da API embaixo do campo (#178):** quando a API recusa um formulário por causa de um campo (400 com `details`), o erro aparece embaixo do campo certo, com borda vermelha, `aria-invalid` e `aria-describedby` (o leitor de tela lê o rótulo, "inválido" e a mensagem). A função `errosPorCampo(details)` (`src/api/mensagens.js`) transforma a lista da API em `{ campo: mensagem }`, e o componente `ErroCampo` mostra a mensagem. Vale no login e no cadastro (pelo `AuthService`), no perfil (os erros da API usam o mesmo lugar dos erros que o front já confere), em "Adicionar à coleção" (quantidade), em "Criar anúncio" (quantidade e descrição) e em "Monte sua oferta" (quantidade e mensagem). Com os campos marcados, o aviso geral diz "Confira os campos destacados."; erro de um campo que a tela não mostra (por exemplo, a quantidade de uma carta oferecida) e erro sem campo continuam no aviso geral. E-mail ou username já cadastrado continua como mensagem geral, porque a API não diz qual dos dois. Algumas mensagens ainda vêm em inglês, as padrão do zod (por exemplo, quantidade 0 em anúncio, coleção ou oferta: "Too small: expected number to be >=1"); traduzir é mudança no backend.
- **Sessão expirada sem recarregar a página (#177):** quando o token vence (ou é trocado) e uma rota protegida responde 401, o app sai da conta, mostra o toast "Sua sessão expirou. Entre de novo." e vai para `/login` sem recarregar a página; depois de entrar, volta para a página onde a pessoa estava (vale também para quem abre uma página privada sem estar logado). Senha errada no login não conta como sessão expirada. Um 401 que volta de uma requisição feita com um token antigo (a pessoa já entrou de novo) é ignorado: só o 401 do token que está salvo agora encerra a sessão. Se o token foi apagado à mão e a tela ainda mostra a pessoa logada, o primeiro 401 só fecha a sessão local, sem toast, e o header volta a mostrar "Entrar" na hora. Login e cadastro agora passam pelo mesmo `http` (axios) do resto do app, com as mesmas mensagens de erro ("Não conseguimos falar com o servidor..." quando a API está fora). Por baixo, o `main.jsx` é o único lugar que cria o `LocalTokenStore` e entrega as peças prontas (injeção de dependência): `createAuthService({ http, tokenStore })` e `configurarHttp({ tokenStore, aoExpirarSessao, aoPerderToken })`. O `http.js` não cria store nenhum; guarda na requisição o token que mandou e, no 401, chama `aoExpirarSessao` se esse token ainda é o salvo, que faz o `logout()` e avisa o componente `SessaoExpirada` (dentro do router) pelo avisador `auth/sessaoExpirada.js`.
- **Funções da API com página e filtros (#174):** `listCollection`, `listWishlist`, `listMyListings`, `getPublicCollection`, `listMyOffers` e `listMyTrades` aceitam um objeto `{ page, limit, ...filtros }` e devolvem `{ items, pagination }` (o perfil público também traz o `user`). Sem parâmetro, ou com o status em texto nas ofertas e trocas, continuam devolvendo o mesmo de antes, então nenhuma tela mudou. Com o objeto, sempre vão `page` (padrão 1) e `limit` (padrão 20), e os filtros vazios ficam fora da URL (`semVazios` e `parametrosDaPagina`, em `src/api/parametros.js`). Ofertas e trocas paginadas precisam do `side` (`sent` ou `received`).
- **Propostas e trocas paginadas (#175):** `/propostas` e `/trocas` pedem à API só a aba aberta (`side=received` ou `sent`), com o status e a página, e mostram "Anterior" e "Próxima" embaixo da lista (o componente `Paginacao`, o mesmo do marketplace). Aba, status e página ficam na URL (`/propostas?aba=enviadas&status=ACCEPTED&page=2`), então o F5 e um link mantêm tudo; valor inválido (`?aba=xyz`, `?page=-1`) cai no padrão (Recebidas, todos os status, página 1), e trocar de aba ou de status volta para a página 1. As abas não mostram mais a contagem entre parênteses, porque a API não devolve o total. Se a página ficar vazia (por exemplo, depois de recusar a última oferta dela), aparece "Nenhuma oferta nesta página." e o "Anterior" continua funcionando. A leitura da URL fica no hook `useFiltrosNegociacao`, usado pelas duas páginas.
- **Abas acessíveis (#169):** o componente `Abas` (`src/components/Abas/`) segue o padrão de abas do W3C e não sabe nada de ofertas ou trocas, para ser reaproveitado (a #85 vai usar em Meus anúncios). Props: `rotulo` (nome do grupo para o leitor de tela), `abas` (`[{ valor, rotulo, contagem? }]`), `selecionada`, `onSelecionar` e `idPainel`. O grupo tem `role="tablist"`, cada aba é um `role="tab"` com `aria-selected` e `aria-controls`, e só a aba ativa entra no Tab; as setas esquerda e direita (dando a volta), Home e End trocam de aba na hora e levam o foco junto. O conteúdo fica num `role="tabpanel"` com `aria-labelledby={idDaAba(idPainel, aba)}`. Em `/propostas` e `/trocas`, o `AbasNegociacao` junta as `Abas` (Recebidas e Enviadas) com o filtro de status. Trocar de aba ou de status substitui a URL em vez de criar uma entrada nova no histórico, então o Voltar do navegador leva para a página anterior; mudar de página continua criando entrada, como no marketplace.
- **Pendências (#170):** o header mostra um selo com o número de ofertas recebidas aguardando resposta ao lado de "Propostas", e de trocas esperando a sua confirmação ao lado de "Trocas" (regra da #213) (só quando passa de zero). Com pendência, o link já abre as recebidas pendentes (`/propostas?aba=recebidas&status=PROPOSED`), e o leitor de tela ouve "Propostas, 2 aguardando resposta". A contagem vem do hook `usePendencias` (duas chamadas com `status=PROPOSED`, contadas no front), que reconta ao trocar de página quando a última contagem tem mais de 1 minuto e logo depois de aceitar, recusar, cancelar, criar ou concluir algo, e de fechar um anúncio (que cancela as ofertas abertas dele): os cartões e o `AcoesAnuncio` disparam um evento do navegador (`avisarQuePendenciasMudaram()`) e o header escuta, sem passar props. Sem login ou com erro na contagem, não aparece selo. Na aba Recebidas, as ofertas e trocas que esperam você vêm primeiro, já na ordem da API, inclusive entre páginas (#199), e ganham uma borda de destaque. Cada cartão diz o próximo passo embaixo do status ("Aceite ou recuse esta oferta.", "Virou troca: as cartas estão reservadas. Confirme o recebimento em Trocas.", "Você confirmou. Aguardando @ash confirmar.", "As cartas já mudaram de dono."; os textos ficam em `utils/rotulos.js`). As listas vazias levam a algum lugar ("Você ainda não fez ofertas." com "Explorar o marketplace", por exemplo), e com filtro de status sem resultado aparece "Nada com este status." com o botão "Ver todos os status". A grade de cartões cabe em telas de 320px.
- **Perfil com resumo das trocas (#171):** a seção "Minhas trocas" do `/perfil` mostra só as contagens (concluídas, em andamento, recusadas ou canceladas), um link "Ver todas as trocas" para `/trocas` e, quando há troca esperando a sua confirmação (enviada ou recebida, #213), "1 troca esperando sua confirmação" com link para `/trocas?status=PROPOSED` na aba que tem pendência (Recebidas primeiro). Sem trocas: "Você ainda não fez nenhuma troca." com link para o marketplace. A lista detalhada, com as ações, fica só em `/trocas`. O componente novo é o `ResumoTrocas` (a conta fica em `resumirTrocas`, em `utils/negociacao.js`), e saíram o `HistoricoTrocas`, o `TrocaItem` e o `CartaTroca`, com a tabela de status e a função de data repetidas que eles tinham: `STATUS_TROCA` e `formatarData` existem só em `utils/rotulos.js`.
- **Oferta com busca e resumo (#166):** em "Monte sua oferta", o campo "Buscar na sua coleção" filtra as cartas a cada tecla pelo nome, sem diferenciar maiúscula, minúscula e acento ("pokemon" acha "Pokémon"). Com pelo menos uma palavra de 2 letras, a busca também vai para a API (`GET /collection?q=...`, 300 ms depois de parar de digitar), e o resultado da API se junta ao filtro local. O que vem da API passa pelo mesmo filtro do nome da carta, porque a API também procura no nome da expansão: buscar "fire" mostra só cartas com "fire" no nome, e não todas as da "FireRed & LeafGreen". Limitação: a API não ignora acento no nome guardado, então "pokemon" só acha "Pokémon" entre as cartas já carregadas na tela. A coleção agora vem paginada (20 cartas por vez, também na busca), com o botão "Carregar mais cartas" quando tem mais. As cartas marcadas ficam guardadas inteiras, então continuam na oferta, no contador "X/20" e no resumo mesmo quando saem da busca. Busca sem resultado mostra "Nenhuma carta da sua coleção com esse nome." e "Limpar busca". Logo acima de "Enviar oferta", o quadro "Resumo da troca" (`ResumoTroca`, com `aria-live="polite"`) diz "Você recebe: 2× Pikachu (Normal, Near Mint) de @ash." e "Você dá: 2× Fire Energy (Normal, Excellent), 1× Magikarp (Normal, Excellent).", e muda sozinho a cada carta marcada ou quantidade alterada. Antes de enviar, o formulário confere a quantidade de todas as cartas marcadas, inclusive as que a busca escondeu: se alguma está vazia ou fora do limite, a oferta não sai e o resumo avisa qual carta corrigir ("Corrija a quantidade oferecida de Fire Energy (de 1 a 3) antes de enviar."). A paginação com "carregar mais" fica no hook `useListaPaginada`: se uma página falha, as cartas já carregadas continuam na tela e o próximo "Carregar mais cartas" pede de novo a página que falhou (testado em `useListaPaginada.test.js`).
- **Botão "Enviar oferta" sempre à vista (#159):** em "Monte sua oferta", a barra com o botão "Enviar oferta" fica presa no rodapé da tela enquanto a pessoa rola a lista de cartas (`position: sticky` no `.rodapeOferta`, só dentro do formulário: fora dele a barra não cobre o anúncio, e no fim da lista volta ao lugar, sem esconder a última carta). Ao lado do botão, um resumo curto conta as cartas marcadas ("Nenhuma carta selecionada", "1 carta selecionada", "3 cartas selecionadas", função `textoCartasSelecionadas` em `utils/oferta.js`). O quadro "Resumo da troca" da #166 fica logo acima da barra, fora dela, e o aviso "As cartas selecionadas continuam na sua coleção…" foi para baixo do título "O que você oferece". No celular o botão ocupa a largura toda. É o mesmo botão de antes, com as mesmas regras. Navegando só com o teclado, o campo que recebe o foco (caixa da carta, quantidade, link) para acima da barra em vez de ficar escondido atrás dela (`scroll-margin-bottom` nos campos do formulário, #215; conferido no Chrome a 1280 e a 360 px: antes 9 e 12 de 37 campos ficavam cobertos, depois nenhum).
- **Wishlist e Propostas remodeladas (#212):** a wishlist (`/procuro`) virou uma grade de cartas com o primeiro quadro "Adicionar carta à wishlist": ele abre um modal com busca no catálogo (a partir de 2 letras, com o idioma das cartas), resultados em rolagem que carregam mais ao chegar no fim e o botão "Adicionar" (a carta que já está na wishlist aparece como "Na wishlist"). Adicionar e remover atualizam a grade sem buscar a lista de novo, e remover pede confirmação no modal. Em `/propostas`, cada cartão mostra os dois lados ("Você dá" e "Você recebe") com até 2 cartas; com mais, "Ver as N cartas" abre uma galeria num diálogo (fecha no X, no Esc ou clicando fora). A lista deixou o "Anterior"/"Próxima" e carrega mais propostas ao rolar (ou no botão "Carregar mais propostas"); depois de aceitar, recusar, cancelar ou criar troca, os cartões ficam na tela enquanto a lista é atualizada e só o que saiu do filtro some. "Virou troca" vem do novo campo `hasTrade` da oferta, sem a chamada extra a `GET /trades/me`. Tirar uma carta da wishlist usa o novo toast de aviso. Os botões de cada oferta continuam os mesmos.
- **Wishlist completa (#24):** a `/procuro` ganhou o mesmo layout do marketplace: "Ordenar por" (Nome (A–Z), o padrão, ou Mais recentes, `sort=recent`), o painel `PainelFiltros` à esquerda (no celular, o botão "Filtros" abre o modal) com busca pelo nome da carta, Tipo e Raridade (as raridades vêm de `GET /cards/filters?lang=en`, como no marketplace, porque a tabela `Card` guarda a raridade em inglês), selos dos filtros ativos e `Paginacao`. Tudo vai para `GET /wishlist` e fica na URL (`/procuro?type=Fire&sort=recent&page=2`), então o F5 e um link mantêm o filtro; tipo, ordem ou página inválidos na URL são ignorados, e busca com menos de 2 letras ou números (ou mais de 50 caracteres) fica na URL mas não vai para a API. A página traz 23 cartas mais o card "Adicionar carta à wishlist", que aparece em todas as páginas. Cada carta mostra "Ninguém tem ainda", "1 colecionador tem esta carta" ou "N colecionadores têm esta carta" (o `opportunities` da API), o preço de referência quando existe ("US$ 987,13 · referência TCGplayer") e os botões **Já consegui**, "Procurar anúncios" (`/marketplace?cardId=...`) e remover. **Já consegui** abre o `ConfirmModal` com o `FormColecao` (o componente `AdicionarNaColecao`, o mesmo do Tenho do catálogo); a carta entra na coleção e sai da wishlist pela RN-11, e a tela tira o item sem recarregar. Como a wishlist não guarda o idioma, a carta é aberta em português e, se não existir (Base Set, por exemplo), em inglês. O modal de adicionar passou a usar o `useMinhasCartas` (wishlist inteira e coleção): "Na wishlist" vale para carta de qualquer página e "Você já tem" (desabilitado) para carta com unidade na coleção, a mesma regra da RN-12. Remover e Já consegui atualizam a página na hora, com a animação, quando ela é a última; se existe página seguinte, a página é buscada de novo, para a primeira carta da seguinte subir e não sumir. Se a página (além da primeira) fica vazia, volta para a anterior. Adicionar com filtro, com ordem por mais recentes ou com mais de uma página recarrega a página da lista, porque a carta nova pode nem ser daquela página. Lista vazia: "Sua wishlist está vazia. Adicione uma carta para começar."; filtro sem resultado: "Nenhuma carta da wishlist bate com esses filtros" com "Limpar filtros".
- **Troca redonda (#213):** aceitar a oferta já cria a troca. O modal de Aceitar diz que a troca nasce e reserva as cartas dos dois lados; depois do aceite vem o toast "Oferta aceita: a troca foi criada e as cartas estão reservadas." e a pessoa vai para `/trocas?aba=recebidas&status=PROPOSED`. Se a API recusar (422, carta indisponível), a mensagem aparece no cartão e nada muda. O cartão da oferta (`CartaoOferta`) lê `tradeId` (no lugar do `hasTrade` da #212): oferta aceita mostra "Virou troca" e "Ver troca" (para a aba certa de `/trocas`); pelo `tradeStatus`, troca concluída vira "Troca concluída" ("Troca concluída: as cartas já mudaram de dono.") e troca desfeita "Troca desfeita", com "Ver troca" já filtrando o status; sem Recusar, Cancelar ou "Criar troca" (o botão e o `createTrade` saíram do front). Oferta em espera (`onHold`) ganha o selo "Em espera": para o dono, Aceitar fica desativado com "Em espera: este anúncio está em troca com outra pessoa." (ou "...não tem quantidade suficiente agora.", quando o anúncio não está "Em troca"); para quem ofertou, "Em espera: o anúncio está em negociação; se a troca não acontecer, sua oferta volta a valer.", e ele ainda pode cancelar. Oferta cancelada diz o motivo (`cancelReason`): "Você cancelou a oferta.", "Cancelada: @ash fechou o anúncio.", "...bloqueado pela moderação.", "...trocado com outra pessoa." ou "...a conta foi desativada.". O topo de Propostas avisa: "Quando o dono aceita, a troca nasce e as cartas ficam reservadas." No cartão da troca (`CartaoTroca`), as duas partes têm "Confirmar recebimento" enquanto a própria confirmação (`proposerConfirmedAt` ou `recipientConfirmedAt`) está vazia; o modal mostra o que você dá e recebe e avisa que, quando os dois confirmarem, as cartas mudam de dono. O texto diz de quem é a vez: "Confirme quando receber as cartas.", "Você confirmou. Aguardando @misty confirmar.", "@misty já confirmou. Confirme quando receber as cartas." e, concluída, "As cartas já mudaram de dono.". O dono desiste com "Recusar troca" e quem ofertou com "Cancelar troca", mesmo depois de confirmar. O selo do topo conta as ofertas recebidas que dá para aceitar (sem as em espera) e as trocas em andamento, dos dois lados, em que falta a sua confirmação ("Trocas, 2 esperando sua confirmação" para o leitor de tela). Anúncio `IN_TRADE` aparece como "Em troca": selo no cartão do marketplace (no lugar da quantidade, "Em negociação"), no detalhe do anúncio o aviso "Este anúncio está em troca no momento." sem formulário de oferta (quem tem oferta em espera ali continua vendo "Você já fez uma oferta aqui"), em Meus anúncios com Pausar e Fechar (sem editar a quantidade), na moderação com Bloquear e no detalhe da carta "Você tem um anúncio em troca desta carta." com "Ver meu anúncio". Desativar a conta com troca aberta mostra a mensagem da API ("Conclua ou cancele suas trocas antes de desativar a conta.").
- **Português como idioma padrão (#185):** o catálogo, o detalhe da carta e as "Mais desejadas" da home abrem em português; no catálogo, o select de idioma começa em "Português" e os filtros vêm traduzidos ("Fogo", "Treinador"). Quem escolhe outro idioma continua com `?lang=` na URL. Como a TCGdex só tem em português as coleções mais novas (a partir de Black & White), o detalhe aberto sem `?lang` (os links da coleção, wishlist, anúncios e marketplace) tenta o português e, se a carta não existir nele, mostra em inglês com o aviso "Esta carta não tem versão em português; mostrando em inglês." Com `?lang=pt` na URL não há plano B: a pessoa pediu aquele idioma. Buscando por nome em português, o catálogo mostra "Não achou? As coleções antigas só existem em inglês. Procurar em inglês", que repete a busca em inglês, sem os filtros. O idioma padrão, o de reserva e a lista de idiomas ficam num lugar só (`utils/idioma.js`). O backend continua com `en` como padrão.
- **Busca geral no topo (#153):** o site tem um campo de busca só, o do header (componente `BuscaGeral`, o mesmo no desktop e no celular, onde fica abaixo do logo). Ele entende a página: no `/marketplace` e no detalhe de um anúncio busca anúncios (`/marketplace?q=...`, "Buscar no marketplace…"); nas outras páginas busca cartas (`/catalogo?name=...`, "Buscar cartas…"). O campo mostra o termo que está na URL (abrir `/catalogo?name=eevee` mostra "eevee") e acompanha a troca de página: o texto digitado sem Enter é descartado quando a pessoa vai para outra página (digitar "pikachu" na home e clicar em Cards abre o catálogo sem buscar nada). Já no catálogo ou no marketplace, pesquisa sozinho 400 ms depois de parar de digitar (ou na hora com Enter) e mantém idioma, filtros e ordenação, voltando só para a página 1; nas outras páginas, só o Enter leva aos resultados. No marketplace, com menos de 2 letras ou números a página mostra o aviso sem chamar a API. Digitar `@ash` + Enter abre o perfil `/u/ash`; nome inválido (`@a`) mostra "Nome de usuário inválido" embaixo do campo, sem sair da página. O formulário tem `role="search"` e o rótulo muda com a página, e o foco não sai do campo enquanto a URL muda. As regras ficam em `utils/buscaGeral.js`. Sugestões enquanto digita ficam para depois (precisam de uma rota de busca de usuários no backend).
- **Mensagens da busca no catálogo (#161):** o catálogo usa o campo `search` que o `GET /cards` devolve (`searchCards` passou a repassá-lo). Quando o backend descarta palavras e mesmo assim acha cartas, aparece embaixo do resumo o aviso "Não achamos tudo que você digitou (pipi). Mostrando resultados para “charizard” em Base Set, Base Set 2.", numa região `role="status"` para o leitor de tela; com a lista vazia (por exemplo, palavra que só não achou nada por causa de um filtro) o aviso não aparece e quem fala é o estado sem resultado. Sem palavras ignoradas, o resumo cita os sets reconhecidos ("Resultados para “charizard” em Base Set"); só o nome do set vira "Cartas de Base Set, Base Set 2". Nome do set com palavra que não existe (`base xyz`) também avisa: "Não achamos tudo que você digitou (xyz). Mostrando as cartas de Base Set." (#214). O sem resultado mostra o termo ("Nenhuma carta encontrada para “pipipopo”"), o botão "Limpar busca" (volta para "Todas as cartas") e o "Limpar filtros" quando há filtro, e não mostra "Anterior/Próxima"; numa página além da última (`/catalogo?name=pikachu&page=999`) oferece "Voltar para a primeira página".
- **Quero e Tenho no catálogo (#162):** embaixo de cada carta do `/catalogo` há dois botões, fora do link da imagem (clicar neles não abre a carta). **Quero** (coração) liga e desliga a carta na wishlist, com `aria-pressed` e o coração preenchido quando ela está lá; para quem já tem a carta na coleção ele fica desabilitado ("Você já tem esta carta"), porque a API não deixa (409). **Tenho** (+, ou ✓ se você já tem) abre um modal com o formulário de adicionar à coleção, com a carta já escolhida e só os acabamentos que ela tem; ao adicionar, o modal fecha, aparece o toast e, se a carta estava na wishlist, o coração fica vazio e desabilitado (a API tira da wishlist sozinha). Esc ou "Fechar" fecham sem adicionar, e o foco volta para o botão "Tenho". A wishlist e a coleção são carregadas uma vez ao abrir o catálogo (logado) e de novo depois de cada mudança. As duas consultas são independentes (`Promise.allSettled`, no hook `useMinhasCartas`): se uma falha, o catálogo mostra o aviso com "Tentar de novo" e guarda a que deu certo; se já havia um estado anterior, os botões continuam com ele, e se nunca carregou, "Quero" e "Tenho" ficam desligados em vez de fingir que a wishlist está vazia. Deslogado, os botões aparecem e levam ao login, que volta para a mesma busca. A carta vai com o idioma do catálogo (`lang`). A home continua sem botões. Os componentes são o `AcoesRapidas` (só os botões, reaproveitável) e o `ConfirmModal`, que agora mostra só o botão de fechar quando não recebe `onConfirmar`; o `CartaCard` e o `GradeCartas` ganharam a prop `acoes`.
- **Perfil público (#173):** o `/u/:username` não tem mais o campo "Ver perfil de" (o componente `BuscaPerfil` saiu; para achar alguém, digite `@usuario` na busca do topo). O cabeçalho mostra nome, `@username`, "no PokeBox desde" e "N anúncios ativos" (link para `/marketplace?username=...`; "100+" quando há mais de 100, e nada quando não há anúncio). As cartas anunciadas ganham o selo "Para troca", que leva ao anúncio; se os anúncios não carregarem, a coleção aparece sem os selos. A coleção tem busca por nome da carta ou do set e filtro de tipo, feitos pela API, com 24 cartas por página e tudo na URL (`/u/ash?q=pikachu&type=Lightning&page=2`); tipo ou página inválidos caem no padrão, busca sem palavra de 2 letras mostra a dica e não vai para a API, e mudar a busca ou o tipo volta para a página 1. Sem cartas aparece "Nenhuma carta pública."; com filtro, "Nenhuma carta com esses filtros" e "Limpar filtros". Busca com mais de 50 caracteres (o limite da API) mostra a dica "A busca aceita até 50 caracteres..." e não vai para a API, e o perfil continua na tela. Perfil que não existe, conta desativada ou nome fora do formato (404, ou 400 do `username`) mostram "Colecionador não encontrado" com link para o marketplace; um 400 de filtro (qualquer outro campo) mostra "Filtro inválido" com "Limpar filtros" e mantém o campo de busca para corrigir; API fora do ar continua no aviso com "Tentar de novo". A leitura da URL e o cruzamento com os anúncios ficam em `utils/perfilPublico.js`.
- **Header (#79, em partes):** logado, o botão da conta mostra "Olá, <primeiro nome>" no desktop (com o `username` quando não há nome); no celular fica só o ícone. O leitor de tela lê "Olá, <nome>. Menu do usuário".

## Status do projeto

| Parte | Situação |
|---|---|
| Backend | ✅ todas as rotas em produção (autenticação, cartas e catálogo local em `en` e `pt`, coleção, wishlist, perfil, anúncios, ofertas, trocas e admin), com testes de unidade e de integração na CI |
| Deploy | ✅ API no Render, banco no Neon e front na Vercel, com deploy automático a cada release |
| Frontend | 🟡 todas as telas existem e conversam com a API (home, login, cadastro, catálogo, detalhe da carta, marketplace, detalhe do anúncio, coleção, wishlist, meus anúncios, propostas, trocas, perfil e perfil público); o pacotão da PR #195 trouxe modal de confirmação, toasts e mensagens amigáveis, erro embaixo do campo, sessão expirada sem recarregar, listas paginadas com filtros na URL, abas acessíveis, selo de pendências, oferta com busca e resumo, busca geral no topo, Quero e Tenho no catálogo, português como idioma padrão e perfil público com busca; em andamento: o resto do acabamento das telas |
| Testes do front | ✅ Vitest (#179), com 333 testes rodando na CI (funções puras, `AuthService`, `http` com MSW, componentes, hooks, rota privada e páginas com a API simulada), cobertura com mínimo na CI (#180) e E2E com Cypress, com reset do banco, login rápido e workflow na CI (#181), cobrindo os fluxos de autenticação, coleção, wishlist, anúncio, troca e moderação (#182) |

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
