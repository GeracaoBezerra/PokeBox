# SPEC.md — PokeBox

> **Como usar este arquivo**
> - Este arquivo é a **fonte de verdade**. O Claude não deve inventar funcionalidade fora dele.
> - Está **preenchido**. Itens marcados com `⚠ CONFIRMAR` dependem de informação que só o autor tem; os valores escritos ali são padrões assumidos.
> - Se algo mudar durante o mês, atualize aqui primeiro e só depois o código.
> - Textos de interface (toasts, vazios, vocabulário) estão no `DESIGN.md` (seções 5.6, 5.8 e 8).

---

## 1. Visão geral

**O que é:** Plataforma web para cartas reais do Pokémon Trading Card Game. Combina catálogo de cartas, coleção pessoal, lista "Procuro" (wishlist) e marketplace comunitário de anúncios e trocas.

**O que NÃO é:** não é um jogo de Pokémon. Sem batalhas, level, XP, evolução, captura, time de seis, RPG ou Pokédex tradicional. Também não exige pagamento, frete, Correios ou escrow.

**Origem dos dados de cartas:** Pokémon TCG API (catálogo global). Posse, Procuro, anúncios e negociações pertencem ao backend da plataforma.

**Frase para a banca:** "O PokeBox é uma plataforma para colecionadores de Pokémon TCG organizarem suas coleções e negociarem trocas, com cartas que reagem ao toque como cartas físicas."

**Sensação ao abrir o site:** sentar à mesa de jogo: feltro escuro, e a carta como único objeto brilhante.

**Momento wow da demo:** a carta holográfica na tela de detalhe reagindo ao mouse/toque, com acabamento próprio por raridade, e a virada frente/verso.

---

## 2. Escopo do projeto e divisão de trabalho

**Quem faz o backend?** Não haverá backend real inicialmente: mocks (MSW) e JSON local, respeitando o contrato da seção 8. `⚠ CONFIRMAR`

**Se o backend não estiver pronto, o frontend usa MSW respeitando o contrato da seção 8?** Sim.

**Requisitos do curso a cumprir:** `⚠ CONFIRMAR` (tecnologias obrigatórias, número de telas, CRUD, autenticação, testes, deploy, documentação).

**Data e formato da apresentação:** `⚠ CONFIRMAR` (presencial/remoto, tempo de fala, quem avalia). O roteiro da seção 4 foi pensado para ~4 minutos.

---

## 3. Usuários

### 3.1 Colecionador (usuário comum)
Pode: pesquisar cartas, manter coleção, criar Procuro, publicar itens para troca ou venda, procurar anúncios, fazer propostas, negociar trocas, ver perfil público de outros colecionadores.

### 3.2 Administrador
Pode: moderar catálogo local, bloquear anúncios inadequados, administrar usuários.

**Entra no escopo do frontend do mês?** Não. Fica como **evolução**.

### Personas
- **Marina, 16 anos, colecionadora casual.** Tem ~60 cartas e quer completar um set. Acessa pelo celular. Precisa de busca rápida, ver o que falta e adicionar à coleção sem fricção.
- **Rafael, 24 anos, colecionador que troca.** Tem mais de 400 cartas, muitas repetidas. Usa notebook. Quer anunciar repetidas, ver quem tem o que ele procura e fechar trocas com poucos cliques.

---

## 4. Jornada principal

```
Buscar carta → adicionar à coleção → informar quantidade/condição
→ disponibilizar para troca/venda → marcar no Procuro → encontrar anúncio
→ enviar proposta → aceitar/rejeitar → registrar troca
```

**Roteiro de demo (~4 min, ao vivo):**
1. Entrar como Marina (conta de demo já logada).
2. Buscar "Charizard" no catálogo e filtrar por set (Base Set).
3. Abrir o detalhe da carta: tilt, holo, virar. **(momento wow)**
4. Adicionar à coleção (quantidade 1, condição "Quase nova").
5. Marcar o Mewtwo no Procuro.
6. Ir ao Marketplace e ver o anúncio do Rafael com Mewtwo.
7. Enviar proposta: "Você dá" Charizard, "Você recebe" Mewtwo.
8. Trocar para o Rafael, aceitar a proposta e ver a animação da troca com o resumo.

**Contas de demo**
- **Usuário A: Marina.** Cartas: Charizard (Base Set 4/102), Pikachu (58/102) ×2, Venusaur (15/102). Procuro: Mewtwo (10/102).
- **Usuário B: Rafael.** Cartas: Mewtwo (10/102), Blastoise (2/102), Pikachu (58/102). Procuro: Charizard (4/102). Anúncios de troca: Mewtwo.

---

## 5. Mapa de domínio (visão do frontend)

| Conceito | O que é | Observação para a UI |
|---|---|---|
| `cards` | Catálogo global vindo da Pokémon TCG API | Somente leitura. Nunca editável pelo usuário |
| `collection_items` | Posse individual de cada usuário | Tem quantidade e condição |
| `wishlist_items` | "Procuro" | Separado de posse |
| `listings` | Anúncio (sale, trade ou sale_or_trade) | Lastreado na coleção |
| `offers` | Proposta sobre um anúncio | Estados: proposed, accepted, rejected, canceled |
| `trades` | Troca registrada | Contém `trade_items` |
| `users` / `user_profiles` | Conta e perfil | Perfil público só se `is_public=true` |

**Campos por nível de detalhe**
- **Miniatura (grid):** imagem, nome, raridade, número, set, badge de posse.
- **Card expandido (marketplace):** imagem, nome, raridade, condição, quantidade disponível, dono, tipo de anúncio, selo "Reservada".
- **Tela de detalhe:** tudo acima + tipo(s), HP, ataques, artista, set, preço de mercado (se disponível), "quem tem esta carta".

**Valores de condição:** Quase nova (NM), Pouco usada (LP), Usada (MP), Muito usada (HP), Danificada (DMG).

**Idioma e versão:** no MVP a identidade do item na coleção é **carta + condição**. Idioma e versão (holo, reverse holo, first edition) são **evolução**.

---

## 6. Telas mínimas

### 6.1 Login / Cadastro
- **Objetivo:** Criar conta e entrar.
- **Campos e validações:** nome de usuário (único), e-mail válido, senha (mínimo 8 caracteres). Validação ao sair do campo.
- **Estados:** carregando, erro de credencial, erro de rede, sucesso.
- **Rota:** `/login`, `/cadastro`.
- **Apresentação:** simples. A abertura de booster pós-cadastro é opcional (primeiro corte).

### 6.2 Catálogo
- **Objetivo:** Encontrar qualquer carta rapidamente.
- **Componentes:** busca, filtros, grid de cartas, scroll infinito, ordenação.
- **Filtros:** [x] Nome [x] Set [x] Tipo [x] Raridade [x] Supertipo [ ] HP [ ] Artista [ ] Preço [x] "Só o que tenho" [x] "Só o que falta"
- **Paginação:** scroll infinito (IntersectionObserver), 36 por página. Sem virtualização no MVP; imagens lazy.
- **Ação rápida no card:** botão para adicionar à coleção e marcador para Procuro. Clicar na carta abre o detalhe.

### 6.3 Detalhe da carta
- **Objetivo:** Ver a carta como objeto físico e agir sobre ela.
- **Elementos:** carta grande interativa, dados (set, número, raridade, artista, tipos, ataques), botões de coleção e Procuro, "quem tem esta carta" (anúncios ativos), preço de mercado se disponível.
- **Interações da carta:**
  - [x] Tilt seguindo o mouse
  - [x] Efeito holográfico/foil conforme raridade
  - [ ] Arrastar para girar (3D com espessura): bônus
  - [x] Virar a carta (frente/verso)
  - [ ] Giroscópio no celular: fora do escopo
  - [x] Zoom com lupa
- **Layout:** desktop com carta à esquerda e dados à direita; mobile com carta no topo e dados em bottom sheet.

### 6.4 Minha coleção
- **Objetivo:** Ver e gerenciar tudo que possuo.
- **Regras ligadas:** 01, 02, 03.
- **Modos:** [x] Grid [ ] Lista/tabela [ ] Fichário 3x3 (evolução) [x] Agrupado por set [x] Estatísticas
- **Estatísticas:** total de cartas, cartas únicas, % de completude por set, raridade mais comum. Valor estimado só se a API trouxer preço.
- **Editar quantidade e condição:** stepper inline para quantidade, seleção de condição na linha (desktop) ou em drawer (mobile).

### 6.5 Procuro (wishlist)
- **Objetivo:** Marcar cartas desejadas. Procuro não é posse.
- **Regras ligadas:** 04.
- **Oportunidade:** quando há anúncio de uma carta marcada, o item mostra o badge "Disponível para troca" e o menu mostra um contador. Sem notificação push.

### 6.6 Perfil público
- **Objetivo:** Mostrar a coleção de outro colecionador.
- **Regras ligadas:** 10 (evolução; o estado visual existe no MVP).
- **Aparece:** avatar, nome de usuário, bio, coleção pública, anúncios, contagem de trocas.
- **Perfil privado:** cadeado + "Este colecionador mantém a coleção privada."

### 6.7 Marketplace
- **Objetivo:** Encontrar anúncios e propor negociação.
- **Regras ligadas:** 05, 08.
- **Filtros:** tipo de anúncio, raridade, set, condição, "cartas do meu Procuro".
- **Card de anúncio:** carta, quantidade disponível, condição, dono, tipo, selo "Reservada".

### 6.8 Minhas propostas
- **Objetivo:** Acompanhar propostas enviadas e recebidas.
- **Regras ligadas:** 06.
- **Abas:** Recebidas / Enviadas / Histórico. Status com cor **e** ícone, em linha do tempo simples.

### 6.9 Negociação / troca
- **Objetivo:** Montar e confirmar uma troca entre dois colecionadores.
- **Regras ligadas:** 07 (e 08, se entregue).
- **Montar a proposta:** desktop com arrastar da coleção para "Você dá" e "Você recebe"; mobile e teclado por seleção em lista. Os dois caminhos existem.
- **Troca aceita:** as cartas trocam de lado (Motion, 480ms), depois um resumo da troca. Sem confete.
- **Chat/mensagem na proposta:** fora do escopo.

---

## 7. Regras de negócio e como aparecem na interface

O backend é o dono das regras. O frontend **previne** o erro sempre que possível e **explica** quando ele ocorre.

| # | Regra | O que o frontend faz | Resposta esperada da API | Como comunicar |
|---|---|---|---|---|
| 01 | Catálogo ≠ coleção. Adicionar à coleção não duplica o cadastro global | Botão "Adicionar" cria `collection_item`, não altera `card` | 201 | Toast de sucesso + badge "Na coleção ×N" |
| 02 | Só o dono altera a coleção | Nunca exibir controles de edição em coleção alheia | 403 | Alerta de erro de permissão |
| 03 | Quantidade nunca negativa; não oferecer mais do que possui | Stepper com mínimo 0 e máximo possuído | 422 | Limite visual + mensagem explicando o teto |
| 04 | Procuro ≠ posse | Ícones e cores distintos para "procuro" e "tenho" | — | Dois badges diferentes |
| 05 | Anúncio precisa de lastro na coleção | Só permitir anunciar até a quantidade possuída | 422 | Campo de quantidade limitado |
| 06 | Proposta: proposed → accepted/rejected/canceled; só o destinatário aceita/rejeita | Aceitar/Rejeitar só para o destinatário. Cancelar só para o remetente | 403 / 409 | Linha do tempo de status |
| 07 | Troca atômica | Botão de confirmar com loading e sem duplo clique | 200 ou erro sem alteração parcial | Tela de resultado com resumo |
| 08 | Carta comprometida não negocia duas vezes | Selo "Reservada" e desabilitar seleção | 409 | Tooltip explicando o motivo |
| 09 | Snapshot local da carta | Renderizar dados mínimos mesmo com API externa fora | — | Banner "Dados podem estar desatualizados" |
| 10 | Perfil público só se `is_public=true` | Indicador de visibilidade em cada item | 403 / 404 | Cadeado + explicação |

**Regras 08, 09 e 10 (evolução do produto), o que entra no frontend:**
- **08:** entra (selo "Reservada" + tooltip).
- **09:** entra só o banner, alimentado pelo mock.
- **10:** fica como evolução; o estado visual de perfil privado existe.

**Texto exato quando dois usuários tentam negociar a mesma carta (para o segundo):**
"Esta carta acabou de entrar em outra proposta. Escolha outra unidade ou aguarde a resposta."

---

## 8. Contrato de API esperado (rotas)

Linhas marcadas **(novo)** foram acrescentadas por lacunas do contrato original.

| Método | Rota | Uso no frontend |
|---|---|---|
| POST | `/auth/register` | Cadastro |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` (novo) | Renovar sessão |
| POST | `/auth/logout` (novo) | Sair |
| GET | `/auth/me` (novo) | Usuário logado |
| GET | `/cards` | Catálogo com filtros |
| GET | `/cards/:id` | Detalhe |
| GET | `/sets` (novo) | Opções do filtro de set |
| GET | `/collection` | Minha coleção |
| POST | `/collection` | Adicionar |
| PATCH | `/collection/:id` | Editar quantidade/condição |
| DELETE | `/collection/:id` | Remover |
| GET | `/wishlist` | Listar Procuro |
| POST | `/wishlist` | Adicionar |
| DELETE | `/wishlist/:id` (novo) | Remover do Procuro |
| GET | `/users/:username` (novo) | Perfil público |
| GET | `/users/:username/collection` | Coleção do perfil público |
| GET | `/listings` | Marketplace |
| GET | `/listings/:id` (novo) | Detalhe do anúncio |
| POST | `/listings` | Criar anúncio |
| PATCH | `/listings/:id` | Editar anúncio |
| POST | `/listings/:id/offers` | Enviar proposta |
| GET | `/offers/me` | Minhas propostas |
| PATCH | `/offers/:id/status` | Aceitar/rejeitar/cancelar |
| POST | `/trades` | Registrar troca |
| GET | `/trades/:id` | Detalhe da troca |
| POST | `/trades/:id/accept` | Aceitar troca |

> **Fluxo proposto para proposta e troca:** o aceite da proposta (`PATCH /offers/:id/status` com `accepted`) executa a troca atômica e devolve o `trade_id`; o front então abre `GET /trades/:id`. Se o backend mantiver duas etapas, `POST /trades` cria a troca pendente e `/trades/:id/accept` a confirma. `⚠ CONFIRMAR`

**Formato de erro da API**
```json
{ "error": { "code": "QUANTITY_EXCEEDS_OWNED", "message": "Você possui 2 unidades.", "field": "quantity" } }
```
O frontend usa `code` para decidir o comportamento, `message` para mostrar ao usuário e `field` para marcar o campo.

**Autenticação:** JWT em cookie `httpOnly` (`SameSite=Lax`) com refresh token via `/auth/refresh`. Com MSW, simular o mesmo contrato.

**Paginação:** `page` e `pageSize`, como a Pokémon TCG API, com resposta `{ data, page, pageSize, totalCount }`.

---

## 9. Estados globais de interface

Toda tela com dados precisa tratar **todos** estes estados. Não deixe nenhum "para depois".

| Estado | Padrão esperado |
|---|---|
| Carregando | Skeleton com o formato do conteúdo (carta com proporção 63:88), nunca spinner solto |
| Vazio | Mensagem que convida a agir + botão da próxima ação |
| Erro de rede | Explica o que houve + botão "Tentar novamente" |
| Erro de permissão | Explica quem pode fazer a ação |
| Erro de validação | Mensagem no campo, em linguagem simples |
| Conflito (409/422) | Explica a regra violada e o que fazer |
| Sucesso | Feedback curto que nomeia a ação concluída |
| Offline / API externa fora | Banner persistente e uso de dados locais |

Os textos reais dos estados vazios estão em `DESIGN.md`, seção 5.8.

---

## 10. Catálogo de alertas, toasts e badges

### 10.1 Toasts
Textos em `DESIGN.md`, seção 5.6.

### 10.2 Alertas persistentes (banners)
- API externa instável: "A base de cartas está instável. Mostrando dados salvos, que podem estar desatualizados."
- Sessão expirando: "Sua sessão vai expirar em instantes. Salve o que estiver fazendo e entre de novo." (com botão "Renovar sessão")
- Perfil privado: inline na tela do perfil (não é banner global).

### 10.3 Badges
- [x] Raridade
- [x] Tipo do Pokémon
- [x] Condição da carta
- [x] Na coleção ×N
- [x] Procuro
- [x] Reservada
- [x] Tipo de anúncio (venda, troca, ambos)
- [x] Status da proposta (proposta, aceita, rejeitada, cancelada)
- [ ] Novo / recém-adicionado
- [x] Completou o set (só o badge, sem confete)
- [x] Perfil público / privado

Detalhes visuais de cada badge em `DESIGN.md`, seção 5.5.

---

## 11. Efeitos visuais e interações (resumo do que a spec exige)

Detalhes técnicos e visuais ficam no `DESIGN.md`. Aqui ficam só os **requisitos**.

- Cartas reagem ao mouse e ao toque (tilt, reflexo, brilho).
- Raridade altera o acabamento visual da carta.
- Virar a carta (frente/verso) na tela de detalhe; 3D com arrasto é bônus.
- Transições entre grid e detalhe preservando a carta (shared element).
- Feedback animado de troca aceita.
- Todo movimento respeita `prefers-reduced-motion`.

**Orçamento de performance:** 60 fps na tela de detalhe em notebook de sala de aula; ≥ 30 fps em celular Android intermediário. Só uma carta com efeito completo por vez; o tilt dos thumbs só no hover.

**Aparelho da apresentação:** o notebook do autor, ligado a projetor. `⚠ CONFIRMAR` (GPU e resolução do projetor).

---

## 12. Requisitos não funcionais

- **Responsivo:** mobile (360px) até desktop (1440px+).
- **Acessibilidade:** navegação por teclado, foco visível, contraste AA, alt em imagens de carta, movimento reduzido.
- **Performance:** imagens lazy, tamanhos adequados, sem layout shift no grid.
- **Idioma da interface:** pt-BR.
- **Navegadores alvo:** Chrome, Firefox, Safari (incluindo iOS), Edge.
- **Deploy:** Vercel. `⚠ CONFIRMAR`

---

## 13. Fora do escopo (não fazer)

- Batalhas, XP, level, evolução, captura, time de seis, Pokédex tradicional.
- Pagamento, frete, Correios, escrow.
- Painel de administrador, chat nas propostas, giroscópio no celular.
- Idioma e versão (holo, reverse, first edition) como parte da identidade do item.
- Regra 10 completa (perfil público no backend) e modo Fichário 3x3.

---

## 14. Critérios de aceite da demo

A entrega está pronta quando:
- [ ] O roteiro da seção 4 roda do início ao fim sem erro, ao vivo.
- [ ] Toda tela tem os estados da seção 9.
- [ ] Nenhuma ação destrutiva acontece sem confirmação ou "desfazer".
- [ ] A tela de detalhe da carta é o ponto mais polido do produto.
- [ ] Funciona em celular e em desktop.
- [ ] Teclado percorre as telas principais.
- [ ] Detalhe da carta a 60 fps no notebook da apresentação.
- [ ] Lighthouse de acessibilidade ≥ 90 nas telas principais.
- [ ] Sem layout shift visível no grid do catálogo.

---

## 15. Cronograma (4 semanas)

| Semana | Foco | Entrega verificável |
|---|---|---|
| 1 | Brief, DESIGN.md travado, setup, componente Card | Card com efeito de raridade rodando |
| 2 | Catálogo, filtros, detalhe da carta, integração/mocks | Busca + detalhe navegáveis |
| 3 | Coleção, Procuro, marketplace, propostas, troca | Jornada principal completa |
| 4 | Polimento, acessibilidade, performance, deploy, roteiro da demo | Ensaio da apresentação |

**Horas por semana disponíveis:** `⚠ CONFIRMAR`. O cronograma acima assume uma carga que comporte a jornada completa em 4 semanas; se for menor, aplique a ordem de corte.

**Ordem de corte**
- **Sai primeiro:** abertura de booster/embaralhar, 3D com arrasto (R3F), estatísticas além das básicas, zoom com lupa, linha do tempo detalhada das propostas.
- **Nunca sai:** detalhe da carta com holo e virar, catálogo com busca e filtros, coleção, jornada de troca da demo, estados globais, acessibilidade básica.

---

## 16. Decisões em aberto

| Data | Decisão | Resolução |
|---|---|---|
| 2026-10-06 | Quem faz o backend (MSW ou real) | ⚠ Pendente (assumido: MSW) |
| 2026-10-06 | Requisitos do curso, data e formato da apresentação | ⚠ Pendente |
| 2026-10-06 | Horas por semana e aparelho/GPU da apresentação | ⚠ Pendente |
| 2026-10-06 | Aceite da proposta já executa a troca, ou são duas etapas? | Proposta na seção 8; confirmar com o backend |
| 2026-10-06 | Deploy (Vercel assumido) | ⚠ Pendente |
