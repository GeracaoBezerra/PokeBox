# API

A documentação interativa fica no Swagger: `/docs` da API ([produção](https://pokebox-api.onrender.com/docs)).

Para entender o fluxo do app (coleção, wishlist, anúncio, oferta e troca) antes dos detalhes, leia o [guia do backend](../backend/docs/guia-backend.md) (também em [PDF](../backend/docs/guia-backend.pdf)).

Todas as respostas seguem o mesmo formato:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "mensagem", "details": [{ "field": "quantity", "message": "..." }] }
```

`details` só aparece em erro de validação (400). Rotas com 🔒 exigem `Authorization: Bearer <token>`; com 🔓 o token é opcional (muda o que a pessoa enxerga).

**Paginação opcional nas listas (#77).** `GET /collection`, `GET /wishlist`, `GET /users/:username/collection`, `GET /listings/me`, `GET /offers/me` e `GET /trades/me` respondem como sempre quando não recebem nenhum parâmetro novo: a lista inteira, no mesmo formato. Qualquer parâmetro novo (`page`, `limit`, um filtro, `sort` ou `side`) liga a paginação, mesmo sem `page` (aí vem a página 1). A resposta paginada é igual à do `GET /listings`: `{ "success": true, "data": { "items": [] }, "pagination": { "page": 1, "limit": 20, "hasNextPage": false } }`, sem total. `limit` padrão 20, máximo 100 (acima disso → **400** com `details`). Sem `sort`, a ordem é a de antes, com uma exceção: em `GET /offers/me` e `GET /trades/me`, as recebidas sem `status` trazem as pendentes primeiro, paginadas ou não (#199); o `id` desempata para nenhum item repetir ou sumir entre as páginas.

### Saúde

| Rota | | O que faz |
|---|---|---|
| `GET /health` | | processo de pé, não toca no banco; devolve `{ status, version }` (o commit) |
| `GET /health/ready` | | faz `SELECT 1` no banco; **503** se ele estiver fora |

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
| `POST /trades` | 🔒 | `{ offerId }` (rota do PDF). Só quem fez a oferta chama (outro → **403**). Como o aceite já cria a troca, oferta que já virou troca → **409**; oferta que não está aceita → **422** |
| `GET /trades/me?status=&side=&page=&limit=` | 🔒 | minhas trocas: `sent` (fiz a oferta) e `received` (meus anúncios), mais novas primeiro. `side` e as pendentes primeiro em `received` funcionam como em `GET /offers/me` |
| `GET /trades/:id` | 🔒 | detalhe; só as duas partes veem (outros, inclusive ADMIN → 403) |
| `POST /trades/:id/accept` | 🔒 | confirma o recebimento, para as **duas partes**: a primeira só grava a data (`proposerConfirmedAt` ou `recipientConfirmedAt`); a segunda conclui e as cartas trocam de dono, tudo ou nada. Confirmar de novo ou troca finalizada → **409** |
| `POST /trades/:id/reject` | 🔒 | o dono do anúncio recusa (mesmo depois de confirmar; outro → **403**); a reserva é liberada e a quantidade volta aos anúncios ainda abertos |
| `POST /trades/:id/cancel` | 🔒 | quem fez a oferta cancela (mesmo depois de confirmar; outro → **403**); a reserva é liberada e a quantidade volta aos anúncios ainda abertos |

A documentação completa, com exemplos de corpo e resposta, está no **Swagger (`/docs`)**.

### Códigos de status

| Código | Quando |
|---|---|
| 400 | dados inválidos (campo faltando, formato errado, campo a mais) ou JSON inválido no corpo (`"JSON inválido"`) |
| 401 | sem token, token inválido ou expirado, senha errada, ou conta desativada ou suspensa usando um token ainda válido |
| 403 | logado, mas sem permissão (item de outra pessoa, rota de admin) ou login de conta suspensa ou inativa |
| 404 | não encontrado (inclui perfil de conta desativada) |
| 409 | conflito (e-mail/username já usados, carta repetida na wishlist, apagar item com reserva, que já foi anunciado ou que está numa oferta, segunda oferta aberta no mesmo anúncio, oferta que já virou troca, troca já finalizada) |
| 413 | corpo da requisição acima do limite (100 KB) |
| 422 | regra de negócio violada (ex.: quantidade abaixo da reservada ou anunciada, anunciar mais do que tem, variante que a carta não tem, oferta no próprio anúncio, mudar oferta já finalizada, troca de oferta não aceita, cartas da troca indisponíveis) |
| 429 | muitas tentativas de login ou cadastro sem sucesso para o mesmo e-mail a partir do mesmo IP (20 em 15 minutos); o header `Retry-After` diz quantos segundos esperar |
| 500 | erro inesperado (o stack vai para o log com o `x-request-id`) |
| 502 | serviço de cartas (TCGdex) fora do ar, sem conexão ou respondendo errado, e sem cópia da carta guardada: "tente novamente em instantes" |
| 503 | `GET /health/ready` com o banco fora do ar |
| 504 | serviço de cartas (TCGdex) demorou mais de 8 s para responder, e sem cópia da carta guardada |
