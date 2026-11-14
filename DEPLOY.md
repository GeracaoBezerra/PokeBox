# Deploy do PokeBox

Este guia leva o PokeBox da máquina de cada um para a internet. Ele foi escrito para quem nunca fez deploy: cada passo diz o que fazer, por que e como conferir que deu certo.

O código e a configuração já estão no repositório (veja [O que já está pronto no código](#o-que-já-está-pronto-no-código)). O que falta é trabalho de painel: criar as contas, colar endereços e segredos e apertar alguns botões. Isso não tem como ir para o Git, porque envolve senhas.

## Sumário

1. [Como fica no ar](#como-fica-no-ar)
2. [Palavras que aparecem no caminho](#palavras-que-aparecem-no-caminho)
3. [O que já está pronto no código](#o-que-já-está-pronto-no-código)
4. [Antes de começar](#antes-de-começar)
5. [Passo a passo](#passo-a-passo)
6. [Depois que estiver no ar](#depois-que-estiver-no-ar)
7. [Quando algo dá errado](#quando-algo-dá-errado)
8. [Por que escolhemos assim](#por-que-escolhemos-assim)

## Como fica no ar

```
navegador
   │  abre https://pokebox.vercel.app
   ▼
Vercel (front)  ── chama a API ──▶  Render (API em Docker)  ── SQL ──▶  Neon (PostgreSQL)
                                          │
                                          └── busca dados das cartas na TCGdex
```

São três serviços gratuitos, cada um com uma função:

| Serviço | O que guarda | Endereço de exemplo |
|---|---|---|
| Vercel | os arquivos do front (HTML, JS, CSS) já compilados | `https://pokebox.vercel.app` |
| Render | a API rodando dentro de um container Docker | `https://pokebox-api.onrender.com` |
| Neon | o banco PostgreSQL | `ep-xxx.us-east-2.aws.neon.tech` |

Quem publica é o GitHub Actions. Depois de configurado, ninguém mais faz deploy à mão:

```
release develop -> main
        │
        ▼
GitHub Actions (deploy.yml)
  1. roda todos os testes (o mesmo ci.yml das PRs)
  2. se passarem, avisa o Render para publicar a API e espera ela responder com o commit novo
  3. publica o front na Vercel
```

Se um teste falhar no passo 1, os passos 2 e 3 nem começam, e a versão que está no ar continua lá.

## Palavras que aparecem no caminho

**Deploy**: colocar uma versão do sistema no ar. "Fazer deploy da API" é trocar a API que está rodando no Render pela versão nova.

**Build**: transformar o código em algo pronto para rodar. No backend, o `tsc` transforma TypeScript em JavaScript (`dist/`). No front, o Vite junta e comprime tudo em poucos arquivos (`frontend/dist/`).

**Imagem e container Docker**: a imagem é uma "caixa" com o sistema operacional, o Node, as dependências e o nosso código já compilado. O container é essa caixa rodando. O Render recebe o nosso `backend/Dockerfile`, monta a imagem e roda o container.

**Variável de ambiente**: uma configuração que fica fora do código, como `DATABASE_URL`. Na sua máquina ela vem do `.env`; no Render e na Vercel, ela é preenchida no painel. Assim o mesmo código roda em qualquer lugar e nenhuma senha vai para o Git.

**Segredo (secret)**: uma variável que ninguém pode ver, como a senha do banco ou o `JWT_SECRET`. O GitHub mostra `***` no lugar dela nos logs.

**CORS**: regra do navegador. Uma página aberta em `pokebox.vercel.app` só consegue ler a resposta de uma API em outro endereço (`pokebox-api.onrender.com`) se a API disser que aceita esse site. Quem diz isso no PokeBox é a variável `CORS_ORIGIN`. O `curl` e o Swagger não passam por essa regra, só o navegador.

**Health check**: uma rota que só responde "estou viva". A nossa é `GET /health`. O Render usa para saber se a versão nova subiu antes de tirar a antiga do ar, e o pipeline usa para saber quando publicar o front.

**Deploy hook**: uma URL secreta do Render. Quem fizer um `POST` nela dispara um deploy. O pipeline usa essa URL, então não precisa ter a senha da conta do Render.

## O que já está pronto no código

Estes arquivos entraram na PR do deploy. Vale abrir cada um enquanto lê.

| Arquivo | O que faz | Por quê |
|---|---|---|
| `backend/Dockerfile` | dois estágios: `dev` instala tudo e compila; `prod` copia só o `dist/`, as migrations e as dependências de produção | a imagem de produção fica menor (556 MB contra 917 MB), sem jest nem TypeScript, e roda com o usuário `node` em vez de `root` |
| `frontend/Dockerfile` | estágios `dev` (servidor do Vite), `build` (gera o `dist/`) e `prod` (nginx) | o servidor do Vite é lento e não foi feito para a internet; em produção o front é só um punhado de arquivos estáticos |
| `frontend/nginx.conf` | qualquer caminho que não for arquivo devolve o `index.html` | sem isso, dar F5 em `/colecao` mostraria 404, porque não existe um arquivo `colecao` no disco; quem resolve a rota é o React Router |
| `frontend/vercel.json` | o mesmo fallback do nginx, para a Vercel, e desliga o deploy automático da Vercel na `main` | quem publica a `main` passa a ser o pipeline, depois dos testes |
| `docker-compose.yml` | modo desenvolvimento, com healthcheck na API e o front esperando a API ficar pronta | o front não sobe mais antes da API |
| `docker-compose.prod.yml` | só o que muda em produção: estágio `prod`, porta 8080 do nginx e `VITE_API_URL` | dá para testar na sua máquina exatamente as imagens que vão para a nuvem (`make prod-up`) |
| `.github/workflows/ci.yml` | os testes de sempre, agora também chamáveis por outro workflow (`workflow_call`) | os testes ficam num lugar só; o deploy chama o mesmo arquivo |
| `.github/workflows/deploy.yml` | testes, depois Render, depois Vercel | é o "CI/CD" que o PDF do projeto pede |
| `backend/src/config/cors.ts` | aceita só as origens de `CORS_ORIGIN` e as que batem com `CORS_ORIGIN_REGEX` | antes a API aceitava qualquer site |
| `backend/src/app.ts` | o `/health` agora devolve `version`, o commit que está rodando | o pipeline compara esse valor com o commit que acabou de publicar |
| `backend/src/server.ts` | a API escuta em `PORT` | o Render escolhe a porta e avisa por essa variável |

Experimente o modo produção antes de tudo:

```bash
make prod-up
```

Abra `http://localhost:8080`, entre com `ash@pokebox.dev` / `pokebox123`, navegue e dê F5 numa página interna. Se tudo funcionar aqui, o que muda na nuvem são só os endereços. Para voltar ao modo de sempre: `make prod-down` e `docker compose up -d --build`.

## Antes de começar

Façam juntos, em chamada, com uma pessoa compartilhando a tela e a outra conferindo. No plano gratuito, a Vercel e o Render não deixam convidar outra pessoa para a mesma conta (confirmem na hora; se deixarem, convidem). Por isso as contas ficam no nome de um de vocês. Sugestão: as contas ficam com o Patrick, e o Eduardo digita nos painéis enquanto o Patrick acompanha. Na próxima etapa, troquem.

Vocês vão precisar de:

- conta no GitHub com permissão de admin no repositório `GeracaoBezerra/PokeBox`, para criar secrets e o environment;
- alguém que seja admin da organização `GeracaoBezerra`, porque o Render e a Vercel pedem autorização para ler os repositórios da organização;
- um gerenciador de senhas ou um arquivo fora do repositório para anotar os valores que vão aparecer (URLs do banco, deploy hook, token da Vercel). Nunca cole esses valores em issue, PR, commit ou grupo.

Anote os valores nesta tabela, fora do Git, conforme forem aparecendo:

| Nome | De onde vem | Exemplo |
|---|---|---|
| URL pooled do Neon | passo 1 | `postgresql://neondb_owner:SENHA@ep-abc-123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| URL direct do Neon | passo 1 | a mesma, sem o `-pooler` no host |
| `JWT_SECRET` de produção | passo 1 | 64 letras e números aleatórios |
| URL da API | passo 3 | `https://pokebox-api.onrender.com` |
| Deploy hook do Render | passo 3 | `https://api.render.com/deploy/srv-xxxx?key=yyyy` |
| URL do front | passo 5 | `https://pokebox.vercel.app` |
| Token, Org ID e Project ID da Vercel | passo 5 | `vcp_...`, `team_...`, `prj_...` |

## Passo a passo

A ordem importa: a API precisa do banco, o front precisa do endereço da API, e a API precisa do endereço do front para liberar o CORS.

### Passo 1. Banco no Neon e segredo do JWT

1. Entre em https://neon.tech com o GitHub e crie um projeto chamado `pokebox`.
2. Na região, escolha **AWS US East 2 (Ohio)**. A API vai ficar no Render em Ohio também; banco e API perto um do outro deixam cada consulta mais rápida.
3. Na tela do projeto, clique em **Connect**. O Neon mostra a connection string, que é o endereço completo do banco, com usuário e senha. Ela vem em duas versões, e vamos usar as duas:
   - Com **Connection pooling** ligado, o host tem `-pooler` no nome. Essa passa por um "porteiro" que reaproveita conexões, e é a que a API usa no dia a dia. Vai em `DATABASE_URL`.
   - Com **Connection pooling** desligado, a conexão é direta. O `prisma migrate` precisa dela, porque as migrations fazem operações que o porteiro não repassa bem. Vai em `PRISMA_DATABASE_URL`.
4. Confira que as duas terminam com `?sslmode=require`. O Neon só aceita conexão criptografada.
5. Gere o segredo do JWT de produção no terminal:

   ```bash
   openssl rand -hex 32
   ```

   Use um segredo novo, nunca o do seu `.env`. Quem tiver esse valor consegue criar um token de login falso para qualquer usuário.

Como conferir: no painel do Neon, abra **Tables**. Por enquanto não tem tabela nenhuma; elas aparecem no passo 3.

### Passo 2. Levar esta PR para a `main`

O Render e a Vercel publicam a branch `main`. Hoje a `main` ainda não tem nem o TypeScript nem os arquivos de deploy, então ela precisa receber a `develop` primeiro.

1. Merge desta PR na `develop`.
2. Release `develop → main` (PR da `develop` para a `main`, como o time já faz).

Ao entrar na `main`, o workflow **Deploy** vai rodar sozinho e falhar no job `backend (Render)`. É esperado: os secrets ainda não existem. Os testes (job `ci`) devem passar. Vocês vão rodar o Deploy de novo no passo 7.

### Passo 3. API no Render

1. Entre em https://render.com com o GitHub. Clique em **New > Web Service** e conecte o repositório `GeracaoBezerra/PokeBox`. Se ele não aparecer, o Render ainda não tem permissão na organização: clique em **Configure GitHub App** e peça para um admin da `GeracaoBezerra` aprovar.
2. Preencha:

   | Campo | Valor | Por quê |
   |---|---|---|
   | Name | `pokebox-api` | vira o endereço: `https://pokebox-api.onrender.com` (se o nome estiver livre) |
   | Language | Docker | o Render monta a imagem com o nosso Dockerfile |
   | Branch | `main` | só a `main` vai para produção |
   | Region | Ohio (US East) | perto do banco |
   | Root Directory | `backend` | o Dockerfile e o código da API ficam nessa pasta |
   | Dockerfile Path | `./Dockerfile` (padrão) | relativo ao Root Directory |
   | Instance Type | Free | |

   Não precisa escolher o estágio do Dockerfile: sem indicação, o Docker usa o último, que é o `prod`.
3. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | URL pooled do Neon |
   | `PRISMA_DATABASE_URL` | URL direct do Neon |
   | `JWT_SECRET` | o segredo gerado no passo 1 |
   | `JWT_EXPIRES_IN` | `1d` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | por enquanto `http://localhost:5173`; no passo 6 entra a URL da Vercel |

   O Render define sozinho o `PORT` (a porta em que a API deve escutar) e o `RENDER_GIT_COMMIT` (o commit publicado, que aparece no `/health`). Não crie essas duas.
4. Em **Advanced**, preencha **Health Check Path** com `/health`. Com isso, numa publicação nova o Render só troca a versão antiga pela nova quando a nova responde 200 nessa rota. Se a versão nova quebrar ao subir, a antiga continua no ar.
5. Clique em **Create Web Service**. O primeiro deploy começa na hora. Acompanhe a aba **Logs**: primeiro o build da imagem, depois `9 migrations found` e `All migrations have been successfully applied` (o container roda `prisma migrate deploy` antes de subir a API), e por fim `Server is running`.
6. Depois do primeiro deploy, vá em **Settings > Build & Deploy** e deixe **Auto-Deploy** em **Off**. Com ele ligado, o Render publicaria qualquer push na `main` por conta própria, sem esperar os testes do pipeline.
7. Ainda em **Settings**, copie o **Deploy Hook** e guarde. Quem tiver essa URL consegue publicar a API, então ela vai só para o secret do GitHub no passo 7.

Como conferir:

```bash
curl https://pokebox-api.onrender.com/health
```

A resposta esperada é `{"success":true,"data":{"status":"ok","version":"<commit da main>"}}`. Abra também `https://pokebox-api.onrender.com/docs`: o Swagger deve carregar.

### Passo 4. Seed no banco de produção (uma vez só)

As migrations criaram as tabelas, mas o banco está vazio. O seed cria os usuários `admin`, `ash` e `misty` e as cartas de exemplo. Ele roda da sua máquina, apontando para o Neon:

```bash
cd backend
DATABASE_URL="<URL pooled do Neon>" PRISMA_DATABASE_URL="<URL direct do Neon>" npm run db:seed
```

As variáveis escritas antes do comando valem só para ele e têm prioridade sobre o seu `.env`. A saída esperada termina com `Seed ok. 10 cartas · usuários: admin, ash, misty`.

O seed não fica no `CMD` do Dockerfile porque rodaria a cada deploy. Ele também não roda dentro da imagem de produção, que não tem o `tsx`.

Como conferir: no Swagger de produção, `POST /auth/login` com `ash@pokebox.dev` / `pokebox123` devolve 200 e um token.

### Passo 5. Front na Vercel

1. Entre em https://vercel.com com o GitHub. **Add New > Project**, importe `GeracaoBezerra/PokeBox` (mesma autorização da organização do passo 3, se pedir).
2. Na tela de configuração:

   | Campo | Valor | Por quê |
   |---|---|---|
   | Project Name | `pokebox` | vira `https://pokebox.vercel.app` (se estiver livre) |
   | Framework Preset | Vite | a Vercel sabe compilar Vite sozinha |
   | Root Directory | `frontend` | o front fica nessa pasta; é lá que a Vercel lê o `vercel.json` |
   | Environment Variables | `VITE_API_URL` = URL da API, sem barra no fim | |

3. Clique em **Deploy**.

O `VITE_API_URL` precisa estar certo antes do build. O Vite troca `import.meta.env.VITE_API_URL` pelo texto da URL dentro do JavaScript gerado. Mudou o valor? Só um build novo leva a mudança para o site. Pelo mesmo motivo, nunca coloque segredo numa variável `VITE_*`: qualquer pessoa vê o valor abrindo o JavaScript no navegador.

4. Em **Settings > Environment Variables**, confira que `VITE_API_URL` vale para **Production** e **Preview**. Preview é a versão que a Vercel publica para cada PR, num endereço próprio. Não temos API de preview, então os previews usam a mesma API.
5. Pegue os três valores que o pipeline vai usar:
   - Token: em **Account Settings > Tokens**, crie um token chamado `github-actions-pokebox`.
   - Project ID: em **Project Settings > General**.
   - Org ID: em **Account Settings > General**, o campo **Vercel ID** (ou **Team ID**, se o projeto estiver num time).

   Outro jeito de achar os dois IDs: na raiz do repositório, rode `npx vercel link`, escolha o projeto e abra o arquivo `.vercel/project.json` que ele cria. A pasta `.vercel` já está no `.gitignore`.

Como conferir: o site abre, mas o login ainda falha. No DevTools (F12), aba **Console**, aparece um erro de CORS. É o passo 6.

### Passo 6. Liberar o front no CORS da API

No Render, em **Environment**, troque o `CORS_ORIGIN`:

```
CORS_ORIGIN=https://pokebox.vercel.app,http://localhost:5173
```

A lista separada por vírgula diz quais sites podem chamar a API pelo navegador. O `localhost:5173` deixa alguém do time rodar o front local contra a API de produção, se precisar; tirem se não quiserem.

Para os previews das PRs funcionarem com login, acrescente `CORS_ORIGIN_REGEX`. Os endereços de preview mudam a cada PR, como `https://pokebox-git-feat-logo-patricks-projects.vercel.app`, então uma lista fixa não serve. A regex precisa terminar no nome da sua conta ou time na Vercel (o pedaço depois do último hífen, que aparece no endereço dos previews):

```
CORS_ORIGIN_REGEX=^https://pokebox-[a-z0-9-]+-patricks-projects\.vercel\.app$
```

Troque `patricks-projects` pelo de vocês. Nunca use algo como `.*\.vercel\.app`: isso liberaria qualquer site hospedado na Vercel, inclusive o de um estranho.

Salvar as variáveis faz o Render reiniciar a API (uns segundos). Os previews da Vercel vêm com proteção de login da própria Vercel ligada; para mostrar um preview a alguém de fora do time, desligue em **Settings > Deployment Protection**.

Como conferir: login com `ash@pokebox.dev` em `https://pokebox.vercel.app` funciona, e a coleção carrega.

### Passo 7. Secrets do pipeline no GitHub

No repositório, **Settings > Environments > New environment**, com o nome `production`. O environment agrupa os segredos de produção e guarda o histórico de deploys, que aparece na página inicial do repositório com o link do site.

Dentro do environment `production`:

| Tipo | Nome | Valor |
|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK_URL` | deploy hook do passo 3 |
| Secret | `VERCEL_TOKEN` | token do passo 5 |
| Secret | `VERCEL_ORG_ID` | Org ID do passo 5 |
| Secret | `VERCEL_PROJECT_ID` | Project ID do passo 5 |
| Variable | `API_URL` | `https://pokebox-api.onrender.com` (sem barra no fim) |
| Variable | `APP_URL` | `https://pokebox.vercel.app` |

Secret some dos logs (vira `***`) e ninguém consegue ler de volta, nem quem criou. Variable aparece nos logs, por isso só vale para o que já é público, como as URLs.

Agora rode o deploy que falhou no passo 2: aba **Actions > Deploy > Run workflow**, branch `main`.

Como conferir: os três jobs ficam verdes (`ci`, `backend (Render)`, `frontend (Vercel)`). No log do `backend`, aparecem linhas como `tentativa 3: no ar 1a2b3c..., esperado 9f8e7d...` até o commit bater. Na primeira vez pode levar uns minutos, porque o Render monta a imagem do zero.

### Passo 8. Conferir de ponta a ponta

- [ ] `https://pokebox.vercel.app` abre a home.
- [ ] F5 em `https://pokebox.vercel.app/colecao` abre a página, sem 404.
- [ ] Login com `ash@pokebox.dev` e com `misty@pokebox.dev` (duas janelas, uma anônima).
- [ ] Coleção, wishlist, marketplace e detalhe de carta carregam.
- [ ] Uma troca completa entre `ash` e `misty`: anúncio, oferta, aceite.
- [ ] No DevTools, aba **Network**, as chamadas vão para `pokebox-api.onrender.com`, não para `localhost`.
- [ ] Na página inicial do repositório, o environment `production` aparece com o link do site.
- [ ] Depois de 20 minutos sem usar, a primeira chamada demora (a API estava dormindo) e as seguintes voltam ao normal.

Atualizem o README com as URLs reais (seção Deploy) e marquem as issues #103, #104 e #105 como feitas.

## Depois que estiver no ar

O caminho de uma mudança até a produção:

1. PR para a `develop`. O CI roda os testes; nada é publicado.
2. Merge na `develop`.
3. Release `develop → main`. O Deploy roda os testes de novo e publica API e front.

Para publicar de novo sem mudar código (por exemplo, depois de trocar uma variável na Vercel): aba **Actions > Deploy > Run workflow**.

Migration nova não precisa de passo extra. Ela entra na pasta `backend/prisma/migrations`, e o container aplica com `prisma migrate deploy` quando a versão nova sobe. Esse comando só aplica migrations prontas; ele nunca cria migration nem apaga dados por conta própria.

### Voltar uma versão (rollback)

- API: no Render, aba **Events**, escolha um deploy anterior e clique em **Rollback**. Migration não volta junto. Se a versão nova apagou ou renomeou uma coluna, a versão antiga pode quebrar. Por isso uma mudança assim é feita em dois passos: primeiro o código para de usar a coluna, numa release; depois a coluna sai, em outra.
- Front: na Vercel, aba **Deployments**, escolha o anterior e clique em **Promote to Production**.
- Depois, corrijam na `develop` e façam uma release nova.

### Limites do plano gratuito

| Limite | O que acontece | O que fazer |
|---|---|---|
| Render dorme depois de 15 minutos sem uso | a primeira chamada seguinte leva uns 50 segundos | abrir o site uns minutos antes de apresentar |
| Render free tem 750 horas por mês por conta | dá para um serviço ligado o mês inteiro | não criar um segundo serviço na mesma conta |
| Neon suspende o banco quando ninguém usa | a primeira consulta depois disso demora um pouco mais | nada; ele acorda sozinho |
| O cache de cartas em memória some quando a API dorme | a primeira busca de uma carta vai ao cache do banco | nada; o cache no banco (`CardCache`) continua |

Esses limites também entram na apresentação, no critério de limitações e melhorias.

## Quando algo dá errado

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| Console do navegador: `blocked by CORS policy` | a URL do front não está em `CORS_ORIGIN`, ou tem barra no fim, ou é `http` em vez de `https` | conferir o valor no Render; tem que ser igual ao endereço da barra do navegador, sem `/` no fim |
| Log do Render: `Variáveis de ambiente inválidas` | variável faltando ou com formato errado | a própria mensagem diz qual; por exemplo, `JWT_SECRET: precisa ter pelo menos 16 caracteres` |
| Log do Render: `Can't reach database server` ou `P1001` | URL do Neon errada ou sem `?sslmode=require` | copiar de novo do painel do Neon |
| Log do Render: erro no `migrate deploy` | `PRISMA_DATABASE_URL` com a URL pooled | usar a URL direct (sem `-pooler`) |
| Site abre, mas as chamadas vão para `localhost:3000` | `VITE_API_URL` não estava definida no build | definir na Vercel e publicar de novo (Actions > Deploy > Run workflow) |
| F5 numa página interna dá 404 na Vercel | o Root Directory não é `frontend`, então a Vercel não leu o `vercel.json` | corrigir em Project Settings > General |
| Job `backend (Render)` falha com `A versão nova não subiu em 15 minutos` | o build ou a subida falhou no Render | abrir os Logs do Render; a versão antiga continua no ar |
| Job `backend (Render)` falha logo no `curl` do hook | secret `RENDER_DEPLOY_HOOK_URL` ausente ou errado | conferir no environment `production` |
| Job `frontend (Vercel)` falha no `vercel pull` | token, Org ID ou Project ID errados | conferir os três secrets |
| Login dá 401 em produção com usuário do seed | o seed não rodou no Neon | passo 4 |
| A primeira chamada demora quase um minuto | a API estava dormindo | esperado no plano gratuito |

Para olhar o banco de produção: o Neon tem um editor SQL no painel (**SQL Editor**), ou rode `npx prisma studio` na pasta `backend` com a URL direct na frente, como no passo 4.

## Por que escolhemos assim

Estas são as justificativas para a apresentação (critério 3, decisões técnicas).

Neon no lugar do Postgres do Render: o Postgres gratuito do Render expira em 30 dias. O do Neon não expira, e dá para criar branches do banco para testar migrations.

Render para a API: o PDF do projeto cita o Render, ele monta a imagem direto do nosso Dockerfile e tem o deploy hook, que deixa o pipeline publicar sem guardar a senha da conta.

Vercel para o front: gratuita, entende Vite sem configuração e cria um preview para cada PR, o que ajuda na revisão de telas.

Pipeline no GitHub Actions no lugar do deploy automático de cada serviço: o Render e a Vercel sabem publicar sozinhos a cada push, mas aí publicariam mesmo com teste quebrado. Também não haveria como garantir a ordem: o front novo poderia chegar antes da API nova de que ele depende. No pipeline, os testes rodam antes, a API sobe primeiro e o front só sai quando o `/health` responde com o commit novo.

Duas URLs do banco: a pooled aguenta muitas conexões curtas, que é o que a API faz; a direct é a única em que as migrations funcionam direito.

Migrations ao subir o container: cada versão nova da API chega com o banco no formato que ela espera, sem ninguém lembrar de rodar comando. O `migrate deploy` só aplica o que já foi revisado em PR.

Imagem de produção em dois estágios e com usuário `node`: menos coisa instalada significa imagem menor, build mais rápido no Render e menos ferramenta disponível para quem invadir o container.

O que ficou de fora, de propósito: ambiente de homologação com a `develop` publicada (dobraria as contas e os segredos para um projeto deste tamanho) e plano pago para a API não dormir.
