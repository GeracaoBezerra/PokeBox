# DESIGN.md — PokeBox

> **Como usar este arquivo**
> - É o **sistema visual** do projeto. O Claude lê antes de qualquer trabalho de interface.
> - Está **preenchido**. Onde houver `⚠ CONFIRMAR`, é algo que só o autor pode validar.
> - Valores de cor são pontos de partida: **conferir contraste AA com uma ferramenta** antes de travar.
> - Depois de travado, mudar um token aqui muda o projeto inteiro. Não altere valores direto nos componentes.
> - Textos de interface (toasts, vazios, vocabulário) vivem **só aqui** (seções 5.6, 5.8 e 8). O SPEC.md apenas referencia.

---

## 1. Brief de design

### 1.1 Assunto e público
- **Produto:** plataforma para colecionadores de Pokémon TCG (catálogo, coleção, "Procuro", marketplace, trocas).
- **Tarefa principal do usuário:** encontrar cartas, organizar o que possui e negociar com outros colecionadores.

**Público:** jovens colecionadores de TCG. Dispositivos: Android, iOS, desktop e notebook. Uso recreativo, por diversão. Mobile é o dispositivo mais provável, então toque vem antes de mouse.

**Quem avalia e o que valoriza:** visual e UX/UI de alto impacto. A banca precisa sentir polimento, sobretudo na carta.

### 1.2 Direção estética
- [x] **Mesa de jogo:** tapete de feltro, sleeves, cartas como objetos com peso.

**Escolhida:** Mesa de jogo. A interface é o tapete; a carta é o único objeto brilhante da tela. A sensação é de usar um deck físico: carta que inclina, reflete luz, vira e muda de mãos.

**Por quê:** passar um feeling diferente dos sites de TCG com troca, que são tabelas e classificados.

**Tom:** é *tátil, lúdico, preciso*. Não é *infantil, neon-futurista, genérico*.

### 1.3 Referências

| Referência | O que pegar |
|---|---|
| Balatro | Cartas com peso, inclinação e resposta ao toque; mesa como palco |
| Pokémon TCG Pocket | Profundidade/parallax da carta e o ritual de abrir booster |
| pokemon-cards-css (simeydotme) | A **técnica** de foil/holo em CSS (estudar e escrever a própria; checar licença) |
| Hearthstone | O tabuleiro como lugar onde as cartas "vivem" |

**Não parecer:** TCGplayer / Cardmarket (tabelas densas, cara de classificado) e qualquer site de "dashboard SaaS" genérico.

> Anexar prints em `docs/referencias/` (⚠ CONFIRMAR: só o autor tem os prints).

### 1.4 O momento marcante
Regra do projeto: **gaste a ousadia em um só lugar**.

- **Momento marcante:** a carta na tela de detalhe, que reage ao ponteiro, com acabamento próprio por raridade e virada frente/verso.
- Todo o resto (listas, formulários, propostas) é calmo, legível e serve de moldura.
- O embaralhar de deck existe só como abertura de booster (opcional, primeiro a ser cortado).

---

## 2. Anti-padrões (o que faz o projeto parecer feito por IA)

Nenhum destes aparece, a menos que este documento peça explicitamente.

**Tipografia e texto**
- Inter, Roboto ou Arial como fonte principal.
- Destacar uma única palavra do título em cor ou itálico.
- Rótulos em CAIXA ALTA espaçados acima de todo título.
- Textos no estilo `A · B · C` ou `PALAVRA — fragmento`.
- Setinha `→` colada em todo botão e link.
- Copy vaga e vendedora ("Descubra o poder da sua coleção").

**Layout e componentes**
- Conteúdo picado em cards idênticos, mesmo raio, mesma sombra cinza suave.
- Faixas de "3 números grandes com legenda" como hero.
- Tudo centralizado e simétrico.
- Numeração 01/02/03 em conteúdo que não é sequência.
- Glassmorphism e blur como decoração.
- Emoji como ícone.

**Cor**
- Gradiente roxo→azul.
- Fundo creme quente com serifa e acento terracota.
- Preto quase puro com um único acento neon.
- Sombras e gradientes como enfeite em toda superfície.

**Movimento**
- Cada seção entrando com fade + slide-up ao rolar.
- Hover animado em todo card.
- Efeito só porque é possível.

**Específicos do PokeBox**
- Pokébola como elemento decorativo ou ícone.
- Moldura dourada "de RPG" e fontes de fantasia.
- Chuva de partículas ou confete em carta rara.
- Logos, fontes ou artes oficiais da Pokémon como se fossem a marca do projeto.

---

## 3. Layout e estrutura

### 3.1 Princípios
- **Alinhamento:** à esquerda, com grid assimétrico. Centralizar só o palco da carta no detalhe mobile.
- **Densidade:** média. Arejada no detalhe da carta (galeria), mais densa no catálogo e nas propostas.

### 3.2 Grid e larguras
| Item | Valor | Observação |
|---|---|---|
| Largura máxima de conteúdo | 1280px | |
| Colunas (desktop) | 12 | |
| Colunas do grid de cartas | 2 celular, 4 tablet, 6 desktop | No desktop com filtros laterais, 5 |
| Gutter | 16px mobile, 24px desktop | |
| Breakpoints | 390 / 768 / 1024 / 1440 | |
| Linha de texto máxima | 75 caracteres | |

### 3.3 Wireframes

**Detalhe da carta (desktop)**
```
+----------------------------------------------------------+
| nav                                                      |
+----------------------------------------------------------+
|                          |  Nome da carta                |
|      +------------+      |  Set, número, raridade        |
|      |            |      |                               |
|      |   CARTA    |      |  [ Na coleção ×2 ] [ Procuro ]|
|      | interativa |      |                               |
|      |  (palco)   |      |  Ataques / dados              |
|      +------------+      |  ---------------------------  |
|   [virar] [zoom]         |  Quem tem esta carta          |
+----------------------------------------------------------+
```

**Catálogo (desktop)**
```
+----------------------------------------------------------+
| nav                                                      |
+-----------+----------------------------------------------+
| filtros   |  busca ............................  ordenar   |
| set       |  +----+ +----+ +----+ +----+ +----+            |
| tipo      |  |card| |card| |card| |card| |card|            |
| raridade  |  +----+ +----+ +----+ +----+ +----+            |
+-----------+----------------------------------------------+
```

**Troca (desktop)**
```
+----------------------------------------------------------+
|  Você dá                |  Você recebe                   |
|  [c] [c] [ + ]          |  [c] [c]                       |
|  (da sua coleção)       |  (cartas do outro usuário)     |
+----------------------------------------------------------+
|  resumo da troca              [ Cancelar ] [ Confirmar troca ] |
+----------------------------------------------------------+
```

**Mobile de cada tela principal**
- **Detalhe da carta:** carta no topo ocupando ~70% da largura, em palco; dados e ações em *bottom sheet* que sobe da base.
- **Catálogo:** busca fixa no topo, grid de 2 colunas, filtros em gaveta lateral aberta por botão "Filtros".
- **Coleção:** grid de 2 colunas com abas "Coleção | Procuro | Estatísticas"; quantidade editável por stepper no card.
- **Troca:** abas "Você dá | Você recebe" com seleção por **lista** (sem arrastar); resumo e botão de confirmar fixos na base.

---

## 4. Tokens de design

> **Regra:** nenhum componente usa valor solto. Tudo vem destas variáveis, definidas em `src/styles/tokens.css`.

### 4.1 Cor: base
Tema **escuro único** (corta escopo e faz a carta se destacar). Nomes vêm da mesa de jogo.

| Token | Hex | Papel |
|---|---|---|
| `--feltro-fundo` | `#14261F` | Fundo das páginas |
| `--feltro-superficie` | `#1D352B` | Painéis, modais |
| `--tinta` | `#EFE9DC` | Texto principal |
| `--tinta-suave` | `#A9B5AA` | Texto secundário |
| `--ficha-acento` | `#E8B230` | Ação principal (texto sobre ele: `#14261F`) |
| `--borda-costura` | `#5A8269` | Divisórias, contornos |

### 4.2 Cor: semântica (feedback)
Sempre acompanhada de ícone ou texto. Pensadas para fundo escuro.

| Token | Hex | Uso |
|---|---|---|
| `--cor-sucesso` | `#7BD389` | Ação concluída, proposta aceita |
| `--cor-aviso` | `#F59E5B` | Limite atingido, atenção |
| `--cor-erro` | `#FF7A7A` | Falha, proposta rejeitada |
| `--cor-info` | `#7FB6E6` | Neutro informativo |

### 4.3 Cor por tipo de carta (TCG)
Valores calculados de forma aproximada para AA; **validar com ferramenta**.

| Tipo | Token | Hex | Texto sobre ele |
|---|---|---|---|
| Colorless | `--tipo-incolor` | `#B9B6AA` | `#1A1A1A` |
| Darkness | `--tipo-sombrio` | `#3B3550` | `#F2EEFA` |
| Dragon | `--tipo-dragao` | `#6B5BD6` | `#FFFFFF` |
| Fairy | `--tipo-fada` | `#F2A6D0` | `#3A1530` |
| Fighting | `--tipo-lutador` | `#B5532F` | `#FFFFFF` |
| Fire | `--tipo-fogo` | `#C8401F` | `#FFFFFF` |
| Grass | `--tipo-planta` | `#2F7A3C` | `#FFFFFF` |
| Lightning | `--tipo-eletrico` | `#F4C430` | `#1A1A1A` |
| Metal | `--tipo-metal` | `#8A97A6` | `#10161C` |
| Psychic | `--tipo-psiquico` | `#A44A9E` | `#FFFFFF` |
| Water | `--tipo-agua` | `#2569B8` | `#FFFFFF` |

**A cor do tipo muda o fundo da página de detalhe?** Só um leve tom no **palco da carta** (gradiente radial suave sobre o feltro) e no badge. A página inteira continua feltro; mudar tudo brigaria com a identidade.

### 4.4 Tipografia
| Papel | Família | Pesos | Por que essa |
|---|---|---|---|
| Títulos / display | Bricolage Grotesque | 600, 800 | Personalidade com caráter de impresso, sem cara de SaaS |
| Corpo / interface | Figtree | 400, 500, 600 | Legível em tela pequena, amigável |
| Dados (números, preços, código da carta) | IBM Plex Mono | 500 | Número de carta (`025/165`) alinhado, com cara de ficha |

Todas no Google Fonts. Sempre com fallback (`system-ui`, `ui-monospace`).

**Escala tipográfica (razão ~1.25)**
| Token | Tamanho | Line-height | Uso |
|---|---|---|---|
| `--texto-xs` | 12px | 1.4 | Legendas, metadados |
| `--texto-sm` | 14px | 1.5 | Interface densa |
| `--texto-base` | 16px | 1.6 | Corpo |
| `--texto-lg` | 20px | 1.4 | Subtítulos |
| `--texto-xl` | 25px | 1.3 | Títulos de seção |
| `--texto-2xl` | 31px | 1.2 | Títulos de página |
| `--texto-3xl` | 39px+ | 1.1 | Display |

Regras: sentence case, linhas de até 75 caracteres, `font-variant-numeric: tabular-nums` em números de tabela.

**Tratamento tipográfico especial:** o **nome da carta** no detalhe usa Bricolage 800 em `--texto-2xl`/`3xl`, com set e número em Plex Mono logo abaixo. É o único texto com tratamento de display fora de títulos de página.

### 4.5 Espaçamento
Escala base de 4px: `--esp-1: 4px`, `2: 8`, `3: 12`, `4: 16`, `5: 24`, `6: 32`, `7: 48`, `8: 64`, `9: 96`.

**Ritmo:** arejado no detalhe da carta (usa `--esp-7` a `--esp-9` ao redor do palco), compacto no catálogo e propostas (`--esp-3` a `--esp-5`).

### 4.6 Raio de borda
| Token | Valor | Onde |
|---|---|---|
| `--raio-carta` | `4.8% / 3.4%` (cantos de ~3 mm da carta real) | A carta |
| `--raio-controle` | `6px` | Botões, inputs |
| `--raio-painel` | `14px` | Painéis e modais |
| `--raio-pilula` | `999px` | Badges |

### 4.7 Sombras e elevação
| Token | Valor | Uso |
|---|---|---|
| `--sombra-repouso` | `0 1px 0 rgba(0,0,0,.4)` | Elementos apoiados |
| `--sombra-elevada` | `0 8px 24px rgba(0,0,0,.35)` | Menus, popovers |
| `--sombra-carta` | Calculada em JS pela inclinação: deslocamento oposto ao tilt (até ~14px), blur 24–40px, opacidade ~.45 | Carta interativa ("paira") |

### 4.8 Bordas e divisórias
Bordas **só codificam informação**: agrupamento (painel), estado (carta selecionada: contorno de 2px em `--ficha-acento`) e foco (anel de 2px em `--ficha-acento` com offset). Nada de borda decorativa.

---

## 5. Componentes

Para cada componente, **estado não definido vira improviso**.

### 5.1 PokemonCard (o componente principal)

**Proporção fixa 63:88** (carta real). Nunca distorcer.

| Variante | Onde aparece | Efeitos |
|---|---|---|
| `thumb` | Grid do catálogo/coleção | Tilt leve só no hover (dispositivos com mouse), brilho sutil por raridade (CSS) |
| `medium` | Marketplace, propostas | Sem tilt (foco em legibilidade) |
| `hero` | Detalhe da carta | Tilt, holo completo, reflexo, virar |

**Camadas visuais (de baixo para cima)**
1. Imagem da carta
2. Máscara de brilho (foil) conforme raridade
3. Reflexo/glare que segue o ponteiro
4. Vidro do sleeve (só no `hero`, bem sutil)
5. Sombra projetada que se desloca com a inclinação

**Estados da carta**
| Estado | Aparência |
|---|---|
| Carregando | Skeleton com a forma da carta |
| Sem imagem | Verso do PokeBox + nome em texto |
| Na coleção | Badge "×N" |
| Procuro | Marcador distinto do "tenho" |
| Reservada | Sobreposição fosca + selo |
| Selecionada (troca) | Contorno de seleção |
| Foco de teclado | Anel de foco visível |

**Sleeve e verso:** tem sleeve sutil só no `hero`. O verso é visível ao virar e usa **arte própria**: padrão de costura sobre feltro com monograma "PB". Nunca o verso oficial da Pokémon.

### 5.2 Acabamento por raridade

**Valide os valores reais de `rarity` retornados pela API e ajuste esta lista.**

| Raridade | Tratamento visual | Intensidade (1–5) | Movimento |
|---|---|---|---|
| Common | Sem efeito, só sombra | 1 | Nenhum |
| Uncommon | Borda com brilho estático leve | 1 | Nenhum |
| Rare | Brilho metálico discreto | 2 | Leve variação com o tilt |
| Rare Holo | Foil que segue o ponteiro | 3 | Segue o ponteiro |
| Rare Holo V / VMAX / ex | Foil + textura + arco-íris suave | 4 | Segue o ponteiro |
| Ultra Rare / Full Art | Textura + arco-íris mais forte | 4 | Segue o ponteiro |
| Illustration Rare / Special Illustration Rare | Camadas da arte com parallax + glare | 4–5 | Parallax + ponteiro |
| Secret Rare / Hyper Rare | Dourado com brilho lento que atravessa a carta | 5 | Brilho lento + ponteiro |
| Promo | Selo discreto "Promo" + brilho leve | 2 | Leve |

Referência técnica: *pokemon-cards-css* (simeydotme). **Estude a técnica e escreva a sua**; verifique a licença antes de copiar qualquer código.

**Som/haptic/moldura:** sem som. Vibração curta (`navigator.vibrate(15)`) no Android ao abrir uma carta de intensidade ≥ 4. Sem moldura extra, exceto o dourado das Secret.

### 5.3 Visualização 3D
- **No MVP, 3D é feito em CSS** (`perspective` + `transform`), com espessura simulada por sombra de borda.
- Rotação por arrasto com react-three-fiber é **bônus** (primeiro corte do prazo).
- Retorno suave à posição de repouso (mola da seção 6.2).
- Só uma carta interativa por vez.
- Fallback sem efeito se `prefers-reduced-motion` ou sem suporte.

**Fundo da carta 3D:** o ambiente da página (feltro) com uma luz suave vinda de cima (gradiente radial) e leve tom do tipo.

### 5.4 Botões
| Variante | Uso | Regras |
|---|---|---|
| Primário | Uma ação principal por tela | `--ficha-acento`, texto `--feltro-fundo` |
| Secundário | Ações alternativas | Contorno |
| Terciário | Ações discretas | Só texto |
| Destrutivo | Remover, cancelar proposta | Pede confirmação ou "desfazer" |

Estados: repouso, hover, foco, pressionado, **carregando (mantém largura)**, desabilitado (com motivo em tooltip).

**Texto dos botões principais**
- Adicionar carta: "Adicionar à coleção"
- Enviar proposta: "Enviar proposta"
- Confirmar troca: "Confirmar troca"

### 5.5 Badges
| Badge | Forma | Cor | Ícone | Texto |
|---|---|---|---|---|
| Raridade | Pílula | Neutra, escala por intensidade | Símbolo de raridade | "Rare Holo" etc. |
| Tipo Pokémon | Pílula | Token de tipo | Ícone do tipo | "Fogo" etc. |
| Condição | Pílula pequena | Neutra | Nenhum | "Quase nova" etc. |
| Na coleção | Pílula | `--ficha-acento` | Check | "Na coleção ×N" |
| Procuro | Pílula | `--cor-info` | Lupa | "Procuro" |
| Reservada | Pílula | `--cor-aviso` | Cadeado | "Reservada" |
| Status da proposta | Pílula | Semântica | Relógio / check / x | proposta / aceita / rejeitada / cancelada |
| Tipo de anúncio | Pílula | Neutra | Etiqueta | venda / troca / ambos |
| Perfil público/privado | Pílula | Neutra | Olho / cadeado | "Público" / "Privado" |

Regra: **estado nunca só por cor**. Sempre cor + ícone ou texto.

### 5.6 Toasts e alertas

**Toast (temporário):** canto inferior no mobile, superior direito no desktop. Duração 4s (erro fica até dispensar). Ação "Desfazer" quando reversível.

**Banner (persistente):** faixa no topo para condições contínuas (API externa instável, sessão expirando).

**Diálogo de confirmação:** só para ações irreversíveis. Título com a ação, corpo com a consequência, botões com verbos ("Remover carta" / "Manter").

| Situação | Tipo | Texto |
|---|---|---|
| Carta adicionada | toast sucesso | "Carta adicionada à coleção." |
| Carta removida | toast + desfazer | "Carta removida da coleção." [Desfazer] |
| Quantidade acima do possuído | aviso no campo | "Você tem {n} unidades. Escolha até {n}." |
| Carta reservada | tooltip | "Esta carta está em outra proposta e volta a ficar livre se ela for recusada ou cancelada." |
| Proposta enviada | toast sucesso | "Proposta enviada para {nome}." |
| Proposta aceita | toast sucesso | "Troca concluída. As cartas já estão na sua coleção." |
| API de cartas fora | banner | "A base de cartas está instável. Mostrando dados salvos, que podem estar desatualizados." |
| Sem permissão | erro | "Só o dono da coleção pode alterar estas cartas." |
| Falha de rede | toast erro | "Sem conexão. Verifique sua internet e tente de novo." [Tentar novamente] |
| Conflito (carta já reservada) | erro | "Esta carta acabou de entrar em outra proposta. Escolha outra unidade ou aguarde a resposta." |

### 5.7 Formulários
- Rótulo sempre visível (não só placeholder).
- Erro no campo, em linguagem simples, dizendo **como corrigir**.
- Validação ao sair do campo, não a cada tecla.
- Botão de enviar mostra carregando e evita duplo envio.

### 5.8 Estados vazios, carregando e erro
- **Carregando:** skeleton com a forma real (carta 63:88, linhas de lista). Sem spinner solto.
- **Vazio:** convite à ação + botão. 
- **Erro:** o que aconteceu, o que fazer, botão "Tentar novamente".

**Elemento gráfico recorrente do vazio:** um **slot de carta** (retângulo 63:88 de contorno tracejado, como marcação no tapete). Único uso permitido de borda tracejada.

**Textos dos estados vazios**
| Tela | Texto |
|---|---|
| Coleção | "Sua coleção ainda não tem cartas. Busque no catálogo e adicione a primeira." |
| Procuro | "Você ainda não marcou nenhuma carta. Abra uma carta no catálogo e toque em Adicionar ao Procuro." |
| Propostas recebidas | "Nenhuma proposta por enquanto. Anuncie cartas repetidas para receber propostas." |
| Busca sem resultado | "Nenhuma carta encontrada para “{termo}”. Confira a grafia ou remova um filtro." |
| Marketplace sem anúncios | "Nenhum anúncio com esses filtros. Limpe os filtros ou publique o primeiro anúncio." |
| Perfil sem itens públicos | "{nome} ainda não tornou nenhuma carta pública." |

### 5.9 Navegação
- **Desktop:** barra superior com Catálogo, Minha coleção, Procuro, Marketplace, Propostas, Perfil.
- **Mobile:** barra inferior com 5 itens (Catálogo, Coleção, Marketplace, Propostas, Perfil). "Procuro" fica como aba dentro de Coleção.

### 5.10 Ícones
**Phosphor Icons**, estilo *regular* (traço). Um único estilo no projeto inteiro. Ícones de tipo Pokémon são próprios (seção 7), não da biblioteca.

---

## 6. Movimento

### 6.1 Princípios
1. **Movimento que responde a uma ação é bem-vindo** (abrir, expandir, confirmar, arrastar). Movimento espontâneo é raro e intencional.
2. Uma **coreografia principal** (entrada da tela de detalhe). O resto é quieto.
3. Sempre `prefers-reduced-motion`: sem tilt, holo animado ou parallax; versão estática de todo efeito.
4. Só `transform` e `opacity` para animar.

### 6.2 Tokens de movimento
| Token | Valor | Uso |
|---|---|---|
| `--dur-rapida` | 120ms | Hover, foco, pressionar |
| `--dur-media` | 240ms | Abrir/fechar, toasts |
| `--dur-lenta` | 480ms | Transição de página, carta |
| `--ease-saida` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entradas |
| `--ease-entrada` | `cubic-bezier(0.64, 0, 0.78, 0)` | Saídas |
| Mola da carta | stiffness 170, damping 20 | Tilt e retorno |

### 6.3 Catálogo de animações
Bibliotecas: **CSS + Motion**. GSAP e react-spring ficam de fora (uma biblioteca de animação a menos para manter).

| Animação | Onde | Biblioteca | Entra? |
|---|---|---|---|
| Tilt seguindo o ponteiro | Carta hero e thumb | CSS + rAF | Sim |
| Foil/holo por raridade | Carta | CSS puro | Sim |
| Reflexo (glare) | Carta hero | CSS puro | Sim |
| Virar a carta | Detalhe | Motion | Sim |
| Rotação 3D com arrasto | Detalhe | react-three-fiber | Não (bônus) |
| Carta do grid vira o detalhe (`layoutId`) | Catálogo → Detalhe | Motion | Sim |
| Stepper de quantidade com limite | Coleção | Motion | Sim |
| Adicionar à coleção (carta "voa" ao ícone) | Catálogo | Motion | Não |
| Linha do tempo da proposta | Propostas | Motion | Sim (simples) |
| Troca aceita (cartas trocam de lado) | Troca | Motion | Sim |
| Abrir booster / embaralhar deck | Pós-cadastro | Motion | Opcional (primeiro corte) |
| Confete em conquista | Set completo | — | Não (só badge "Completou o set") |
| Skeleton shimmer | Carregando | CSS | Sim |
| Transição entre páginas | Global | Motion | Sim (só opacity, 240ms) |

**Coreografia principal (grid → detalhe)**
1. Clique na carta.
2. A carta sobe e cresce até o palco via `layoutId` (480ms).
3. O feltro escurece e ganha um leve tom do tipo (300ms).
4. Nome, raridade e ataques entram em sequência (60ms de intervalo).
5. O holo "acorda" e passa a seguir o ponteiro.

---

## 7. Imagens e conteúdo visual

- Imagens vêm da Pokémon TCG API (versão pequena no grid, grande no detalhe).
- Proporção 63:88, dimensões declaradas para evitar layout shift.
- Sem imagem de stock genérica.

**Elementos gráficos próprios:** logo, textura de feltro (ruído SVG sutil), verso da carta, slot vazio e ícones de tipo. **Quem faz:** o autor, com apoio do Claude para gerar SVGs.

**Logo e nome:** "PokeBox" em Bricolage Grotesque 800, acompanhado de monograma "PB" dentro de um retângulo 63:88 inclinado ~6°. Sem Pokébola, sem logo oficial.

> Aviso no rodapé: "Projeto educacional sem fins lucrativos, não afiliado à Nintendo, Creatures, GAME FREAK ou The Pokémon Company."

---

## 8. Voz e texto da interface

**Regras**
- Sentence case. Sem caixa alta em rótulos.
- Voz ativa e verbos claros: "Salvar alterações", não "Enviar".
- **Mesmo nome para a mesma ação em todo o fluxo.**
- Descreva o que é ou faz, sem vender.
- Erros **não pedem desculpa** e nunca são vagos: dizem o que houve e como resolver.
- Vazio é convite à ação.
- Termos do usuário, não do sistema.

**Personalidade:** amigável e direta, sem piada forçada.
- **Sucesso:** "Carta adicionada à coleção."
- **Erro:** "Você tem 2 unidades. Reduza a quantidade para 2 ou menos."
- **Vazio:** "Sua coleção ainda não tem cartas. Busque no catálogo e adicione a primeira."
- **Confirmação:** "Remover esta carta da coleção? Você pode desfazer por alguns segundos."

**Vocabulário fixo**
| Conceito | Termo na interface |
|---|---|
| collection | Coleção |
| wishlist | Procuro |
| listing | Anúncio |
| offer | Proposta |
| trade | Troca |
| condition | Condição |

Valores de condição: *Quase nova*, *Pouco usada*, *Usada*, *Muito usada*, *Danificada* (equivalentes a NM, LP, MP, HP, DMG).

---

## 9. Acessibilidade visual

- Contraste AA (4.5:1 texto normal, 3:1 texto grande e componentes de interface).
- Foco visível em todo controle interativo, com estilo próprio do projeto.
- Nenhuma informação só por cor.
- Alvos de toque mínimos de 44×44px.
- Efeitos de brilho não devem prejudicar a leitura do nome e dos dados da carta.
- Movimento reduzido: alternativa estática para todo efeito.
- Sem flashes rápidos: holo com transições suaves.
- Tudo que for arrastar tem alternativa por teclado/lista.

---

## 10. Checklist de revisão visual (antes de dar uma tela como pronta)

- [ ] Parece feita **para o PokeBox** ou serviria para qualquer site?
- [ ] Só há **um** ponto de ousadia na tela?
- [ ] Alguma coisa da seção 2 (anti-padrões) apareceu?
- [ ] Hierarquia clara: o que o olho vê primeiro, segundo, terceiro?
- [ ] Tokens usados, sem valores soltos?
- [ ] Raios e sombras têm significado, ou são todos iguais?
- [ ] Os textos seguem a seção 8?
- [ ] Testada em 390px e 1440px?
- [ ] Removi um "acessório" (um detalhe decorativo que não serve à tela)?

---

## 11. Diário de decisões de design

| Data | Tentativa | Resultado | Decisão |
|---|---|---|---|
| 2026-10-06 | Direção "revista/almanaque" | Descrição do autor (deck, cartas passando) combinava mais com mesa de jogo | Mesa de jogo |
| 2026-10-06 | Várias bibliotecas de animação | Escopo grande para 4 semanas | CSS + Motion; R3F e GSAP fora |
| 2026-10-06 | Embaralhar deck como destaque | Competia com o momento marcante | Só na abertura de booster (opcional) |
