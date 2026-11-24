# 0008. Deploy: Vercel, Render, Neon e pipeline no GitHub Actions

Data: 14/11/2026 · Issues #102 a #105 · PR #122

## Decisão

| Peça | Escolha | Por quê |
|---|---|---|
| Front | Vercel | Grátis e entende Vite sem configuração |
| API | Render | Citado no enunciado; monta a imagem pelo nosso Dockerfile e tem deploy hook |
| Banco | Neon | O PostgreSQL grátis do Render expira em 30 dias; o do Neon não expira |
| Publicação | `deploy.yml` no GitHub Actions | Os testes rodam antes; a API sobe primeiro e o front só sai quando o `/health` responde com o commit novo |

Outras escolhas:

- Duas URLs do banco: a pooled para a API e a direta para as migrations.
- Migrations aplicadas quando o container sobe: cada versão da API encontra o banco no formato que espera.
- Imagem de produção em dois estágios, rodando com o usuário `node`: 556 MB contra 917 MB da de desenvolvimento.
- `/health` não consulta o banco (serve ao Render e ao monitor de uptime sem acordar o Neon); `/health/ready` consulta.

## Alternativas descartadas

- Deploy automático de cada serviço: publicaria com teste quebrado e o front poderia chegar antes da API.
- Ambiente de homologação com a `develop` publicada: dobraria contas e segredos.
- Plano pago para a API não dormir: resolvido com um monitor de uptime (UptimeRobot a cada 5 min). Um workflow agendado do GitHub foi tentado antes e descartado porque rodou 1 vez em 5 horas.

## Consequências

- Um merge na `main` publica tudo em poucos minutos, sempre com os testes verdes.
- Se o monitor falhar, a primeira chamada depois de 15 min parada demora cerca de 2 min.
