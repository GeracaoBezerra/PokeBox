# 0011. Autenticação com JWT e senhas do seed fora do repositório

Data: outubro e 15/11/2026 · PR #122

## Decisão

- JWT (HS256, validade de 1 dia) guardado no `localStorage` do navegador. Senha com bcrypt.
- As senhas dos usuários do seed vêm do `.env` (`SEED_ADMIN_PASSWORD` e `SEED_DEMO_PASSWORD`), obrigatórias e diferentes entre si.

## Por quê

- JWT no `localStorage` é a forma mais simples e prática de autenticar com front e API em domínios diferentes (Vercel e Render), e funciona bem para o tamanho do projeto.
- O repositório é público e o app está na internet. Uma senha no README daria acesso de admin a qualquer pessoa.

## Consequências

- Risco conhecido: um script injetado na página (XSS) leria o token. O próximo passo é refresh token com cookie `httpOnly` (dívida técnica).
- Sem refresh token, a sessão expira em 1 dia e a pessoa entra de novo.
- O bcrypt no custo 12 deixa o login lento na CPU do plano gratuito do Render: cerca de 2 s por login, e uma fila longa com uns 20 logins ao mesmo tempo ([teste de carga de 24/11](../observabilidade-e-performance.md#teste-de-carga-em-produção-2411)).
