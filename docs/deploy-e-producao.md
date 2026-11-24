# Deploy

Por que Vercel, Render e Neon: [decisão sobre o deploy](decisoes/0008-deploy.md).

```mermaid
flowchart LR
  PR[PR para a develop] --> CI["ci.yml<br/>testes, cobertura, lint, build"]
  CI -->|verde + revisão| D[develop]
  D -->|PR de release| M[main]
  M --> CD["deploy.yml<br/>roda o CI de novo"]
  CD --> R["API no Render<br/>(deploy hook)"]
  R -->|/health com o commit novo| V[Front na Vercel]
```

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

O workflow `.github/workflows/deploy.yml` roda a cada push na `main` e também pode ser disparado à mão na aba Actions. Se algum teste falhar, nada é publicado. Ele só publica o front depois que o `/health` da API responde com o commit novo (`data.version`), ou um mais novo que o inclua, para o front nunca chegar antes da API de que precisa. Se a versão não subir em 15 min, o job falha e o front não sai.

Configuração de produção no código:

- `backend/Dockerfile` tem dois estágios. O `dev` instala tudo e compila; o `prod` copia só o resultado e as dependências de produção, roda como `node` e tem `HEALTHCHECK`. O Render usa o último, o `prod`.
- `frontend/Dockerfile` tem o estágio `dev` (Vite), o `build` (gera `dist/`) e o `prod` (nginx com `frontend/nginx.conf`). A Vercel não usa Docker; o nginx serve para o modo produção local.
- `frontend/vercel.json` manda qualquer caminho para o `index.html`, para o F5 em `/colecao` não dar 404, e desliga o deploy automático da Vercel na `main`, que passa a ser feito pelo pipeline.
- A API aceita chamadas do navegador só dos sites em `CORS_ORIGIN` ou dos que batem com `CORS_ORIGIN_REGEX` (os previews da Vercel).

Catálogo da busca em produção (#78):

- Primeira carga: Actions > Catalog sync > Run workflow, na `main`. Ele roda perto do Neon, cabe no limite de 120 min e não precisa da URL do banco no terminal. Também dá para rodar da máquina: `cd backend && DATABASE_URL="<URL do Neon>" npm run catalog:sync` (`-- pt` para um idioma só; `--refresh-details` busca de novo o detalhe de todas as cartas). Depois, o workflow semanal só busca o detalhe das cartas novas. Como o seed, o script não roda dentro da imagem de produção, que não tem o `tsx`.
- Depois, o workflow `.github/workflows/catalog-sync.yml` roda o mesmo script toda segunda às 06:00 UTC (e à mão, em Actions > Catalog sync > Run workflow, escolhendo a `main`). Ele usa o secret `DATABASE_URL` do environment `production`, com a URL do Neon. Sets novos saem poucas vezes por ano, então uma vez por semana basta; se o GitHub atrasar ou pular um agendamento, nada quebra, a busca só demora mais para ver o set novo.

## API acordada no plano gratuito

O plano gratuito do Render dorme depois de 15 min sem uso, e a primeira chamada seguinte leva cerca de 2 min. Um monitor externo gratuito (UptimeRobot) chama `GET /health` a cada 5 min e avisa por e-mail se a API cair. Antes era um workflow agendado do GitHub Actions; ele foi removido porque o GitHub atrasa e descarta agendamentos (rodou 1 vez em 5 horas). O `/health` não toca no banco, então o Neon continua dormindo.

## Segredos e variáveis do pipeline

Ficam no environment `production` do repositório:

| Nome | Tipo | Usado por |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | secret | `deploy.yml`, para publicar a API |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secret | `deploy.yml`, para publicar o front |
| `API_URL`, `APP_URL` | variável | `deploy.yml`, para conferir a API e o site depois do deploy |
| `DATABASE_URL` | secret | `catalog-sync.yml` (URL pooled do Neon) |

No Render, `RENDER_GIT_COMMIT` (do próprio Render) vira o `version` do `/health`.
