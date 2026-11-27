export const REPOSITORIO = "https://github.com/GeracaoBezerra/PokeBox";

const doc = (caminho) => `${REPOSITORIO}/blob/main/${caminho}`;

export const ENDERECOS = [
  { rotulo: "App", href: "https://poke-box-gt.vercel.app" },
  { rotulo: "API", href: "https://pokebox-api.onrender.com" },
  { rotulo: "Swagger", href: "https://pokebox-api.onrender.com/docs" },
  { rotulo: "Repositório", href: REPOSITORIO },
  { rotulo: "Board", href: "https://github.com/orgs/GeracaoBezerra/projects/1" },
];

export const PASSOS_TROCA = [
  "Você encontra no marketplace o anúncio de uma carta que procura e monta uma oferta com cartas da sua coleção.",
  "O dono do anúncio aceita a oferta. A troca nasce na hora e as cartas dos dois lados ficam reservadas.",
  "Cada um confirma quando recebe as cartas. Na segunda confirmação, as cartas mudam de dono nas duas coleções.",
];

export const RECURSOS = [
  { titulo: "Catálogo", texto: "Todas as cartas da TCGdex em português e inglês, com busca que tolera erro de digitação e filtros.", to: "/catalogo" },
  { titulo: "Coleção", texto: "As cartas que você tem, com condição, acabamento e quantidade. Você escolhe o que fica público.", to: "/colecao" },
  { titulo: "Wishlist", texto: "As cartas que você procura e quantos colecionadores já têm cada uma.", to: "/procuro" },
  { titulo: "Marketplace", texto: "Os anúncios de troca da comunidade, com filtros por carta, condição e colecionador.", to: "/marketplace" },
  { titulo: "Propostas e trocas", texto: "As ofertas que você mandou e recebeu e as trocas em andamento, com avisos no topo quando é a sua vez.", to: "/propostas" },
];

export const SECOES_PROJETO = [
  {
    id: "arquitetura",
    titulo: "Arquitetura, POO e SOLID",
    texto: [
      "O backend é TypeScript com Express e Prisma, em camadas: rotas, controllers, services e repositórios. As regras de negócio ficam em funções puras, testadas sem banco.",
      "As dependências entram pelo construtor, e só a raiz de composição (container.ts) cria as classes. Assim um teste troca o banco ou o JWT por uma versão falsa sem mexer no service.",
    ],
    itens: [
      "Herança e polimorfismo: os erros de domínio estendem AppError, e cinco tradutores de erro seguem a mesma interface.",
      "Padrões: Decorator no cache das cartas, Repository, Unit of Work nas transações de troca, Chain of Responsibility nos erros e Strategy na senha e no token.",
    ],
    link: { rotulo: "Arquitetura completa", href: doc("docs/arquitetura.md") },
  },
  {
    id: "docker",
    titulo: "Docker Compose",
    texto: [
      "Um docker compose up sobe banco, API e front, nessa ordem, cada um esperando o anterior ficar saudável. O seed cria usuários e cartas de exemplo.",
      "Há também um banco de teste separado, o Jaeger para ver traces e um modo que roda as imagens de produção na máquina.",
    ],
    link: { rotulo: "Como rodar", href: doc("docs/desenvolvimento.md") },
  },
  {
    id: "testes",
    titulo: "Testes",
    texto: [
      "A pirâmide tem quatro camadas: unidade e integração no backend (a integração usa PostgreSQL de verdade), testes do front com a API simulada e E2E com Cypress no navegador.",
    ],
    itens: [
      "948 testes de unidade e 195 de integração no backend, com 98,3% das linhas cobertas.",
      "519 testes no front, com 87,0% das linhas, e 11 fluxos E2E, entre eles a troca completa.",
      "A CI barra a PR se a cobertura cair abaixo do mínimo.",
    ],
    link: { rotulo: "Testes e cobertura", href: doc("docs/testes.md") },
  },
  {
    id: "cicd",
    titulo: "CI/CD e deploy",
    texto: [
      "Toda PR roda typecheck, lint, testes e build no GitHub Actions, e o merge só libera com esses checks verdes. O E2E também roda em toda PR, com o projeto inteiro no Docker.",
      "Um merge na main publica sozinho: a API vai para o Render, o pipeline espera o /health responder com o commit novo e só então o front sai na Vercel. O banco fica no Neon.",
    ],
    link: { rotulo: "Deploy e produção", href: doc("docs/deploy-e-producao.md") },
  },
  {
    id: "observabilidade",
    titulo: "Logs, traces e performance",
    texto: [
      "Cada requisição gera uma linha de log em JSON com um id que também volta para o navegador, o que permite achar no Render o erro que alguém viu na tela. Os traces vão para o Grafana Cloud pelo OpenTelemetry.",
    ],
    itens: [
      "Compressão: a lista de 100 cartas caiu de 22,6 KB para 2,8 KB.",
      "Um índice novo levou a lista de anúncios de 823 para 2.096 requisições por segundo.",
      "Busca por trigramas no catálogo local: charzard caiu de 33,4 ms para 1,5 ms.",
    ],
    link: { rotulo: "Observabilidade e performance", href: doc("docs/observabilidade-e-performance.md") },
  },
  {
    id: "decisoes",
    titulo: "Decisões e o que ficou de fora",
    texto: [
      "Usamos PostgreSQL no lugar do MySQL pedido em aula, pelas travas nas trocas e pela busca tolerante a erro. O PokeBox é só de trocas porque venda traria pagamento, frete e disputa, e nada disso está nas regras.",
      "Também decidimos guardar o catálogo de cartas no nosso banco, porque a API pública falha em rajadas. Já o leilão, o chat, a notificação em tempo real e o refresh token ficaram de fora, cada um com o motivo registrado.",
    ],
    link: { rotulo: "Todas as decisões", href: doc("docs/decisoes/README.md") },
  },
  {
    id: "processo",
    titulo: "Como o time trabalhou",
    texto: [
      "Cada tarefa é uma issue no board, com contexto, como testar e quando está pronta. Uma issue vira uma branch e uma PR para a develop, revisada por um colega com a CI verde. A main só recebe PRs de release.",
      "As branches develop e main são protegidas: exigem os checks, uma aprovação e as conversas resolvidas.",
    ],
    link: { rotulo: "Processo do time", href: doc("docs/processo.md") },
  },
  {
    id: "ia",
    titulo: "Uso de IA",
    texto: [
      "O time usou o Claude Code no planejamento, na escrita das issues, na implementação, nos testes, na revisão de PRs e na documentação, sempre com uma pessoa decidindo e revisando.",
      "Um teste escrito com IA só valia se falhasse quando a regra era quebrada de propósito. Os erros da IA e como foram corrigidos estão registrados.",
    ],
    link: { rotulo: "Uso de IA", href: doc("docs/ia.md") },
  },
  {
    id: "limitacoes",
    titulo: "Limitações e próximos passos",
    itens: [
      "No plano gratuito do Render, a API dorme sem uso. Um monitor externo chama o /health a cada 5 minutos para mantê-la acordada.",
      "O token fica no localStorage e não há refresh token. O próximo passo é um cookie httpOnly.",
      "Uma troca não tem prazo para ser confirmada e pode segurar as cartas por tempo indeterminado.",
      "Ainda não há verificação de e-mail nem recuperação de senha, e o cadastro aceita senhas fracas para facilitar os testes.",
      "Próximos passos: o leilão de cartas e um marketplace no estilo da OLX, com chat entre os colecionadores.",
    ],
    link: { rotulo: "Limitações e dívidas", href: `${REPOSITORIO}#limitações-dívidas-e-próximos-passos` },
  },
];
