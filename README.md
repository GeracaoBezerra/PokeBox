# PokeBox

Plataforma para colecionadores de cartas **Pokémon TCG**: organizar a coleção, montar a wishlist, ver a coleção pública de outros colecionadores e **trocar cartas** entre si.

O PokeBox é **só de trocas**. Não existe venda, preço de venda nem pagamento. O preço que aparece nas cartas é uma **referência de mercado** (vinda da TCGdex), útil para comparar o que se dá e o que se recebe numa troca.

Projeto em equipe do curso **Geração Tech**.

> Este README descreve o que está na branch `develop`.

## Sumário

- [Stack](#stack)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Usuários de teste (seed)](#usuários-de-teste-seed)
- [Testes](#testes)
- [API](#api)
- [Regras de negócio](#regras-de-negócio)
- [Status do projeto](#status-do-projeto)
- [Como contribuir](#como-contribuir)

## Stack

| Parte | Tecnologia |
|---|---|
| Backend | Node.js (LTS), Express 5, Prisma 7 (`@prisma/adapter-pg`), zod 4, JWT, bcrypt |
| Banco | PostgreSQL 17 |
| Frontend | React 19, Vite, React Router, axios |
| Dados das cartas | API pública [TCGdex](https://tcgdex.dev), com cache no banco |
| Testes | Jest (backend), ESLint e build (frontend) |
| Documentação da API | Swagger em `/docs` |
| Infra | Docker Compose, GitHub Actions (CI) |

## Estrutura do repositório

```
.
├── backend/
│   ├── prisma/            schema, migrations, seed e cartas do seed (seed-data/cards.json)
│   ├── docs/db.md         modelo de dados, constraints, migrations e seed
│   ├── docs/guia-backend  guia do backend e das regras de negócio (.md e .pdf)
│   ├── scripts/           snapshot-cards.js (regera as cartas do seed)
│   └── src/
│       ├── routes/        URLs e middlewares de cada rota
│       ├── controllers/   lê a requisição, valida com zod e responde
│       ├── services/      regras de negócio
│       ├── repositories/  acesso ao banco (Prisma) e à TCGdex
│       ├── schemas/       validação de entrada (zod)
│       ├── middlewares/   autenticação, papéis, validação e erros
│       ├── utils/         regras puras (testadas com jest), AppError, tradutor de erros do Prisma
│       └── docs/          especificação do Swagger
├── frontend/              app React (Vite)
├── docker-compose.yml     banco, backend e frontend
└── .env.example           variáveis de ambiente
```

O backend segue as camadas **routes → controllers → services → repositories**.

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

JWT_SECRET=troque-por-um-segredo-longo
JWT_EXPIRES_IN=1d
```

Use `localhost` nas URLs: dentro do Docker o `docker-compose.yml` troca o host para `tcg-db` sozinho.

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

### Depois de puxar a develop

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

### Ver o banco

- Prisma Studio: `cd backend && npx prisma studio` (abre no navegador).
- Ou qualquer cliente PostgreSQL (DBeaver, extensão do VS Code etc.) com os dados do `.env`.

## Usuários de teste (seed)

Senha de todos: **`pokebox123`**

| Usuário | E-mail | Papel | O que tem |
|---|---|---|---|
| `admin` | `admin@pokebox.dev` | ADMIN | nada na coleção |
| `ash` | `ash@pokebox.dev` | USER | Charizard holo 1ª edição (anunciado), Pikachus, Ultra Ball (4), Furret (privado) |
| `misty` | `misty@pokebox.dev` | USER | Blastoise holo (anunciado), Mew holo, Fire Energy (10), Pikachu |

Também há 4 itens de wishlist e uma oferta em aberto: a misty oferece o Mew holo dela pelo Charizard do ash. Rodar o seed de novo volta essa oferta para `PROPOSED`, a não ser que ela já tenha virado troca (aí o seed avisa; para recomeçar, `npx prisma migrate reset`, que apaga o banco local). Detalhes em [`backend/docs/db.md`](backend/docs/db.md#seed).

O seed **pode rodar várias vezes** sem duplicar nada e funciona sem internet, porque as cartas ficam em `backend/prisma/seed-data/cards.json`.

### Testar rápido no Swagger

1. Abra http://localhost:3000/docs.
2. `POST /auth/login` com `{ "email": "ash@pokebox.dev", "password": "pokebox123" }`. Esse já é o exemplo do Swagger: basta clicar em **Try it out** e **Execute**. Os exemplos das outras rotas também seguem o seed (o Charizard do ash, a oferta da misty); o do cadastro usa `brock`, que não está no seed, para não dar 409.
3. Copie o `token` da resposta, clique em **Authorize** e cole. O token fica salvo até fechar a aba (um F5 não desloga).
4. Chame `GET /collection`, `GET /wishlist`, `GET /listings/me`, `GET /offers/me`, `GET /trades/me` etc. Os ids que as outras rotas pedem saem dessas listas (a descrição de cada campo diz onde pegar).
5. Para conferir o papel ADMIN, `GET /auth/admin-check`: com `admin@pokebox.dev` dá 200; com o ash, 403.

O `/docs` chama a API no mesmo endereço em que foi aberto, então funciona em qualquer porta. Rotas sem cadeado não precisam de login. No detalhe da carta com `lang=pt`, use uma carta recente (ex.: `sv03.5-025`): a TCGdex não tem o Base Set em português e responde 404.

## Testes

```bash
cd backend
npm test
```

São testes de unidade (jest) das regras puras, dos schemas e do aceite da troca com os repositórios simulados. Não precisam de banco.

Há também um teste **com banco** que prova a RN-07 de verdade: força um erro no meio do aceite de uma troca e confere que quantidades, reservas e status ficaram iguais. Ele fica desligado por padrão (a CI não tem PostgreSQL). Para rodar, com o banco no ar e as migrations aplicadas:

```bash
cd backend
RUN_DB_TESTS=1 npm test
```

Ele cria dois usuários `rb_*` temporários e apaga tudo no fim.

A CI (GitHub Actions) roda em toda PR para `develop` e `main`:

| Job | O que roda |
|---|---|
| `backend` | `npm ci`, `npx prisma generate`, `npm test` |
| `frontend` | `npm ci`, `npm run lint`, `npm run build` |

Os dois precisam passar para mergear.

## API

Para entender o fluxo do app (coleção, wishlist, anúncio, oferta e troca) antes dos detalhes, leia o [guia do backend](backend/docs/guia-backend.md) (também em [PDF](backend/docs/guia-backend.pdf)).

Todas as respostas seguem o mesmo formato:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "mensagem", "details": [{ "field": "quantity", "message": "..." }] }
```

`details` só aparece em erro de validação (400). Rotas com 🔒 exigem `Authorization: Bearer <token>`; com 🔓 o token é opcional (muda o que a pessoa enxerga).

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
| `GET /cards?name=&page=&limit=&lang=` | | busca cartas na TCGdex, com paginação. Entende nome de set e ignora palavras que não acham nada: `charizard base` traz os Charizard com o do Base Set primeiro, e `charizard base x pipi popo` ainda traz os Charizard. O resultado vem ordenado por relevância, cada carta traz `set: { id, name }` e `number`, e a resposta traz `search: { name, sets, ignored }` dizendo como a busca foi entendida. Erro de digitação (`charzard`) ainda não é tolerado |
| `GET /cards/:id` | 🔓 | detalhe da carta (ataques, variantes, preço de referência) e os anúncios ativos dela; com login, traz `user` (quantas você tem, se está na sua wishlist, se você tem anúncio ativo dela) |

### Coleção

| Rota | | O que faz |
|---|---|---|
| `GET /collection` | 🔒 | minha coleção, com `available` (quantidade menos reservada) |
| `POST /collection` | 🔒 | adiciona carta: `cardId`, `quantity`, `finish`, `firstEdition`, `condition?`, `isPublic?`. Se a carta estava na sua wishlist, ela sai (RN-11) e a resposta traz `removedFromWishlist: true` |
| `PATCH /collection/:id` | 🔒 | muda `quantity`, `condition` ou `isPublic`. A condição não muda enquanto o item está num anúncio aberto, numa oferta aberta ou aceita ou numa troca aberta (**409**) |
| `DELETE /collection/:id` | 🔒 | remove o item (não remove se tiver reserva ou se já foi anunciado; nesse caso, zere a quantidade) |
| `GET /users/:username/collection` | | coleção pública de um colecionador |

### Wishlist

| Rota | | O que faz |
|---|---|---|
| `GET /wishlist` | 🔒 | minha wishlist, com `opportunities` em cada carta |
| `POST /wishlist` | 🔒 | adiciona carta (`cardId`) |
| `DELETE /wishlist/:id` | 🔒 | remove |

### Anúncios de troca

| Rota | | O que faz |
|---|---|---|
| `GET /listings?q=&cardId=&username=&condition=&finish=&firstEdition=&setId=&type=&rarity=&sort=&page=&limit=` | | anúncios ativos, com `hasNextPage`. `q` busca por palavras no nome da carta ou do set (`charizard base` acha o Charizard do Base Set). Os filtros se somam; `sort` é `recent` (padrão), `oldest` ou `name`. Valor inválido → **400** com `details` |
| `GET /listings/me` | 🔒 | meus anúncios, em qualquer status |
| `GET /listings/:id` | 🔓 | detalhe; anúncio pausado, fechado ou bloqueado só aparece para o dono e para o ADMIN |
| `POST /listings` | 🔒 | anuncia um item da minha coleção: `collectionItemId`, `quantity`, `description?` |
| `PATCH /listings/:id` | 🔒 | muda `quantity`, `description` ou `status` (`ACTIVE`, `PAUSED`, `CLOSED`); ADMIN só bloqueia (`BLOCKED`) ou desbloqueia. Fechar ou bloquear cancela as ofertas abertas e as aceitas que ainda não viraram troca; diminuir cancela as aceitas que pedem mais do que a nova quantidade |

### Ofertas de troca

| Rota | | O que faz |
|---|---|---|
| `POST /listings/:id/offers` | 🔒 | faz uma oferta num anúncio: `quantity` (quantas cartas do anúncio quero), `message?` e `items` (de 1 a 20 cartas da minha coleção, cada uma com `collectionItemId` e `quantity`) |
| `GET /offers/me?status=` | 🔒 | minhas ofertas: `sent` (que fiz) e `received` (nos meus anúncios), mais novas primeiro |
| `GET /offers/:id` | 🔒 | detalhe; só quem fez a oferta e o dono do anúncio veem (outros → 404) |
| `PATCH /offers/:id/status` | 🔒 | `{ status }`: o dono do anúncio aceita (`ACCEPTED`) ou recusa (`REJECTED`); quem fez a oferta cancela (`CANCELED`). Oferta aceita que ainda não virou troca também pode ser recusada ou cancelada |

### Trocas

A troca é um aperto de mão em dois passos: o dono do anúncio aceita a oferta → **quem fez a oferta** cria a troca (as cartas dos dois lados ficam reservadas) → o **dono do anúncio** conclui e as cartas mudam de dono.

| Rota | | O que faz |
|---|---|---|
| `POST /trades` | 🔒 | `{ offerId }`: quem fez a oferta cria a troca a partir da oferta aceita. Reserva as cartas e ajusta os anúncios |
| `GET /trades/me?status=` | 🔒 | minhas trocas: `sent` (fiz a oferta) e `received` (meus anúncios), mais novas primeiro |
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
| 500 | erro inesperado |
| 502 | serviço de cartas (TCGdex) fora do ar, sem conexão ou respondendo errado, e sem cópia da carta guardada: "tente novamente em instantes" |
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
| **RN-10** Privacidade | Item com `isPublic: false` não aparece no perfil público. O perfil público nunca mostra e-mail, reserva nem dados internos. Conta desativada ou suspensa → **404**. |
| **RN-11** Coleção limpa a wishlist | Carta que entra na coleção sai da wishlist da pessoa, na mesma transação: vale ao adicionar (`POST /collection`) e ao receber numa troca concluída (`POST /trades/:id/accept`). Como a wishlist não tem variante, qualquer condição ou acabamento conta. |

Outras regras que já valem:

- **Variante da carta:** cada item tem `finish` (`NORMAL`, `HOLO`, `REVERSE`) e `firstEdition`. Só aceita combinações que a carta realmente tem na TCGdex (senão **422**).
- **Condição:** `MINT`, `NEAR_MINT`, `EXCELLENT`, `GOOD`, `LIGHT_PLAYED`, `PLAYED` ou `POOR`.
- **Conta:** login de conta suspensa ou inativa → **403**. Excluir a conta só desativa (soft delete); o histórico fica.
- **Cache das cartas:** o detalhe de uma carta é buscado na TCGdex só na primeira vez e guardado por 24h no banco (`CardCache`) e por 1h em memória. Se a TCGdex cair, a API usa a última cópia guardada; sem cópia guardada (ou na busca `GET /cards`, que guarda o resultado em memória por 10 min e a lista de sets por 1 dia; trocar de página não chama a TCGdex de novo), responde **502** (fora do ar) ou **504** (demorou mais de 8 s). O cache é gravado com o id oficial da carta, mesmo que a URL use outra caixa (`/cards/BASE1-4` grava e atualiza o preço de `base1-4`).
- **Preço de referência:** cada carta guarda o preço de mercado da TCGdex (TCGplayer em USD ou Cardmarket em EUR), atualizado quando a carta é consultada de novo. É **só informativo**.
- **Status do anúncio:** o dono alterna entre ativo e pausado e pode fechar; anúncio fechado não volta. Só o ADMIN bloqueia, e só ele desbloqueia (volta como pausado). Um item que já foi anunciado não pode mais ser apagado da coleção, porque o anúncio fica no histórico; para tirá-lo do perfil, zere a quantidade.
- **Integridade no banco:** chaves estrangeiras, uniques e CHECKs em todas as tabelas. Lista completa em [`backend/docs/db.md`](backend/docs/db.md).

### Adaptação: só trocas

O enunciado previa anúncios de venda e de troca. **O time decidiu que o PokeBox é só de trocas** (sem venda nem pagamento). Por isso:

- o anúncio não tem tipo nem preço;
- a oferta diz **quais cartas da coleção** o proponente dá em troca;
- a RN-05 vira "só anuncia o que tem disponível para troca".

### Limitações conhecidas

- Não há prazo de validade para oferta aceita nem para troca aberta: uma oferta aceita que nunca vira troca segura as cartas oferecidas até alguém encerrá-la à mão (o dono recusa ou quem ofertou cancela).
- Uma troca recusada ou cancelada não volta os anúncios que foram reduzidos quando ela nasceu, e a oferta não gera outra troca: é preciso fazer uma oferta nova.

## MVP do front (PR rascunho, não mergear)

A branch `feat/mvp-front` liga as telas do front a **todas** as rotas da API, sem firula, para demonstrar o app ponta a ponta e servir de referência para as telas do board (#22 a #27). Ela inclui a tela de perfil da #50 ligada à API.

```bash
cd frontend && npm install && npm run dev
```

Abra `http://localhost:5173`, entre com um usuário do seed e use o menu: Cards (catálogo), Marketplace, Coleção, Wishlist, Anúncios, Propostas, Trocas e Meu perfil. Para mostrar uma troca, use duas janelas (uma normal e uma anônima), uma com o `ash` e outra com a `misty`. Os erros aparecem com a mensagem da API e o código HTTP, por exemplo "Você já tem uma oferta aberta neste anúncio (409)".

As chamadas ficam em `frontend/src/api/` (axios com interceptores em `http.js`, uma função por rota).

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
