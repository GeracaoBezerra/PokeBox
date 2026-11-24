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
