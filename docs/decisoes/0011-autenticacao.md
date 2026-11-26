# 0011. Autenticação com JWT e senhas do seed fora do repositório

Data: outubro e 15/11/2026 · PR #122 · consequências atualizadas em 26/11

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
- Não há verificação de e-mail: toda conta nasce com `accountStatus = PENDING_VERIFICATION` e `emailVerified = false`, e nada muda esse status. Por isso o login, o perfil público e a busca de colecionadores aceitam conta pendente (`USABLE_STATUSES` em `backend/src/utils/accountStatus.ts`). O e-mail de ativação é dívida técnica ([#252](https://github.com/GeracaoBezerra/PokeBox/issues/252)).
- Não há recuperação de senha: quem esquece a senha perde o acesso. A recuperação por e-mail é dívida técnica ([#253](https://github.com/GeracaoBezerra/PokeBox/issues/253)) e depende do mesmo envio de e-mail da verificação.
- A senha só precisa ter de 8 a 72 caracteres, sem regra de força, para facilitar a criação de usuários nos testes. Ela é guardada com bcrypt. Uma regra de força é dívida técnica ([#254](https://github.com/GeracaoBezerra/PokeBox/issues/254)).
