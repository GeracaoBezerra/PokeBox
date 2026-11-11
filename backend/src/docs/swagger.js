import { CardCondition, CardFinish, ListingStatus, OfferStatus, TradeStatus } from "../generated/prisma/index.js";
import { LANGS } from "../middlewares/validateCardParams.js";

const nullableString = { type: "string", nullable: true };
const typeValue = {
  type: "object",
  properties: { type: { type: "string" }, value: nullableString },
};

const langParam = {
  name: "lang",
  in: "query",
  required: false,
  description: "Idioma da carta (pt-br é aceito e convertido para pt)",
  schema: { type: "string", enum: LANGS, default: "en" },
};

const errorResponse = (description, schema = "ApiError") => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schema}` },
    },
  },
});

const authErrors = {
  401: errorResponse("Token ausente, inválido, expirado ou sessão encerrada"),
  500: errorResponse("Erro interno"),
};

const tcgdexErrors = {
  502: errorResponse("Serviço de cartas (TCGdex) fora do ar, sem conexão ou com resposta inválida, e sem cópia da carta guardada"),
  504: errorResponse("Serviço de cartas (TCGdex) demorou mais de 8 s para responder, e sem cópia da carta guardada"),
};

const collectionItemResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              item: { $ref: "#/components/schemas/CollectionItem" },
            },
          },
        },
      },
    },
  },
});

const addCollectionItemResponse = {
  description: "Item criado ou quantidade somada. Se a carta estava na wishlist, ela sai de lá (RN-11)",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              item: { $ref: "#/components/schemas/CollectionItem" },
              removedFromWishlist: {
                type: "boolean",
                example: true,
                description: "true quando a carta estava na wishlist do usuário e foi removida dela",
              },
            },
          },
        },
      },
    },
  },
};

const collectionItemIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID do item da coleção (pegue em GET /collection)",
  schema: { type: "string", format: "uuid" },
};

const wishlistItemIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID do item da wishlist",
  schema: { type: "string", format: "uuid" },
};

const listingIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID do anúncio (pegue em GET /listings ou GET /listings/me)",
  schema: { type: "string", format: "uuid" },
};

const listingResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              listing: { $ref: "#/components/schemas/Listing" },
            },
          },
        },
      },
    },
  },
});

const listingListResponse = (description, withPagination) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/Listing" },
              },
            },
          },
          ...(withPagination && {
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                hasNextPage: { type: "boolean" },
              },
            },
          }),
        },
      },
    },
  },
});

const cardConditions = Object.values(CardCondition);
const cardFinishes = Object.values(CardFinish);
const listingStatuses = Object.values(ListingStatus);
const offerStatuses = Object.values(OfferStatus);
const tradeStatuses = Object.values(TradeStatus);

const offerIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID da oferta (pegue em GET /offers/me)",
  schema: { type: "string", format: "uuid" },
};

const offerResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              offer: { $ref: "#/components/schemas/Offer" },
            },
          },
        },
      },
    },
  },
});

const tradeIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID da troca (pegue em GET /trades/me)",
  schema: { type: "string", format: "uuid" },
};

const tradeResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              trade: { $ref: "#/components/schemas/Trade" },
            },
          },
        },
      },
    },
  },
});

const tradeActionErrors = (wrongRole) => ({
  400: errorResponse("Id inválido", "ApiValidationError"),
  403: errorResponse(`Não faz parte da troca (inclui ADMIN) ou ${wrongRole}`),
  404: errorResponse("Troca não encontrada"),
  409: errorResponse("Troca já finalizada (não está mais PROPOSED)"),
  ...authErrors,
});

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "PokeBox API",
    version: "1.0.0",
    description: "API do PokeBox",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health", description: "Situação da API" },
    { name: "Auth", description: "Cadastro, login e sessão" },
    { name: "User", description: "Perfil do usuário autenticado" },
    { name: "Cards", description: "Cartas (TCGdex + cache)" },
    { name: "Collection", description: "Coleção do usuário autenticado" },
    { name: "Users", description: "Perfil público dos colecionadores" },
    { name: "Wishlist", description: "Cartas que o usuário autenticado quer ter" },
    { name: "Listings", description: "Anúncios de troca (RN-05: só anuncia o que tem)" },
    { name: "Offers", description: "Ofertas de troca em anúncios (RN-06: oferta finalizada não volta para PROPOSED; aceita sem troca ainda pode ser encerrada)" },
    { name: "Trades", description: "Trocas: oferta aceita vira troca (RN-07: tudo ou nada no aceite; RN-08: cartas reservadas)" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Confere se a API está no ar",
        security: [],
        responses: {
          200: {
            description: "API no ar",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "ok" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Cadastra um novo usuário",
        description:
          "Cria a conta e já devolve um token válido. A senha é gravada com hash bcrypt e nunca retorna na resposta. O user da resposta não traz telefone nem endereço: o perfil completo vem do GET /auth/me.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Usuário criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: {
            description: "Corpo inválido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiValidationError" },
              },
            },
          },
          409: {
            description: "E-mail ou username já cadastrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autentica e devolve o token",
        description:
          "Em caso de credencial inválida a resposta é a mesma para e-mail inexistente e senha errada, de propósito: mensagens diferentes permitiriam descobrir quais e-mails estão cadastrados. O user da resposta não traz telefone nem endereço: o perfil completo vem do GET /auth/me. No /docs, copie o token, clique em Authorize e cole; ele fica salvo até fechar a aba.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Autenticado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: {
            description: "Corpo inválido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiValidationError" },
              },
            },
          },
          401: {
            description: "E-mail ou senha inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          403: {
            description: "Conta suspensa ou inativa",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Dados do usuário autenticado",
        description:
          "Usada pelo front para saber quem está logado ao recarregar a página. O usuário é relido do banco a cada chamada, então suspender uma conta invalida a sessão na hora.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Usuário da sessão",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/AuthUser" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description:
              "Token ausente, inválido, expirado ou sessão encerrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/auth/admin-check": {
      get: {
        tags: ["Auth"],
        summary: "Confere se o usuário logado é ADMIN",
        description:
          "Serve para testar o papel ADMIN: com admin@pokebox.dev responde 200; com um USER (ex.: ash@pokebox.dev), 403.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Usuário é ADMIN",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "acesso de admin ok" },
                      },
                    },
                  },
                },
              },
            },
          },
          403: errorResponse("Usuário logado não é ADMIN"),
          ...authErrors,
        },
      },
    },
    "/user/me": {
      patch: {
        tags: ["User"],
        summary: "Atualiza o perfil do usuário autenticado",
        description:
          "Aceita só campos de perfil, e ao menos um deve ser enviado. Email, senha, role e accountStatus não podem ser alterados por aqui.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Perfil atualizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/AuthUser" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Corpo inválido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiValidationError" },
              },
            },
          },
          401: {
            description:
              "Token ausente, inválido, expirado ou sessão encerrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["User"],
        summary: "Desativa a conta do usuário autenticado",
        description:
          "Soft delete: a conta fica INACTIVE e o registro continua no banco. Depois disso o token deixa de funcionar e o login retorna 403.",
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: "Conta desativada" },
          401: {
            description:
              "Token ausente, inválido, expirado ou sessão encerrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/cards": {
      get: {
        tags: ["Cards"],
        summary: "Lista/busca cartas",
        description:
          "Lista paginada de cartas da TCGdex, com busca opcional. A busca quebra o texto em palavras (sem acento, ignorando palavras de 1 letra) e reconhece nomes de set: em \"charizard base\", \"base\" vira os sets Base Set, Base Set 2 e Expedition Base Set (no máximo 3) e \"charizard\" é procurado no nome. Se a frase inteira não achar nada, cada palavra é tentada sozinha (até 4), e as que não trazem nada voltam em search.ignored. Palavra que só cobre parte do nome de um set (\"pikachu\" em Detective Pikachu) também é procurada no nome quando o resto não acha nada, para \"pikachu\" continuar trazendo todos os Pikachu. O resultado é ordenado por relevância (carta do set reconhecido, nome igual ao buscado, palavras contidas no nome) e paginado sobre a lista inteira, que fica 10 min em memória: trocar de página não chama a TCGdex de novo. A lista de sets fica 1 dia em memória. Cada item traz o set e o número da carta. Sem name, devolve a lista da TCGdex como antes, sem o campo search.",
        security: [],
        parameters: [
          {
            name: "name",
            in: "query",
            required: false,
            description: "Busca por nome e/ou set (aceita parte do nome, nome ou id de set e palavras soltas)",
            schema: { type: "string", maxLength: 50, example: "charizard base" },
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          langParam,
        ],
        responses: {
          200: {
            description: "Lista de cartas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CardListResponse" },
              },
            },
          },
          400: {
            description: "Parâmetros inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiValidationError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          ...tcgdexErrors,
        },
      },
    },
    "/cards/{id}": {
      get: {
        tags: ["Cards"],
        summary: "Detalhes de uma carta",
        description:
          "Busca na memória (1h), depois no banco (24h) e por último na API TCGdex. Login opcional: com token, o bloco user traz quantas unidades você tem, se a carta está na sua wishlist e se você tem anúncio ACTIVE dela; sem token, user é null. Cache: com token, private, no-cache (o navegador confere a cada vez); sem token, private, max-age=60.",
        security: [{}, { bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "ID da carta na TCGdex",
            schema: {
              type: "string",
              pattern: "^[a-zA-Z0-9.\\-]+$",
              example: "base1-4",
            },
          },
          {
            ...langParam,
            description:
              "Idioma da carta (pt-br é aceito e convertido para pt). Nem toda carta existe em todo idioma: a TCGdex não tem o Base Set (base1-4) em português e responde 404. Para testar pt, use uma carta recente, ex.: sv03.5-025.",
          },
        ],
        responses: {
          200: {
            description: "Carta encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CardDetailsResponse" },
              },
            },
          },
          400: {
            description: "Parâmetros inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiValidationError" },
              },
            },
          },
          401: {
            description: "Token enviado, mas inválido ou expirado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          404: {
            description: "Carta não encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          500: {
            description: "Erro interno",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          ...tcgdexErrors,
        },
      },
    },
    "/collection": {
      get: {
        tags: ["Collection"],
        summary: "Lista a coleção do usuário autenticado",
        description:
          "Traz todos os itens, inclusive os com quantidade 0, ordenados pelo nome da carta. available = quantity - reservedQuantity.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Itens da coleção",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: { $ref: "#/components/schemas/CollectionItem" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
      post: {
        tags: ["Collection"],
        summary: "Adiciona uma carta à coleção",
        description:
          "Busca a carta na TCGdex (com cache), grava em Card e cria o item. Se o usuário já tem a mesma carta com a mesma condição, finish e 1ª edição, soma a quantidade no item existente. finish e firstEdition são conferidos contra as variantes da carta; se a TCGdex não informar nenhuma variante, a conferência é ignorada. RN-11: na mesma transação, a carta sai da wishlist do usuário (qualquer condição, acabamento ou 1ª edição); removedFromWishlist diz se ela estava lá.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCollectionItemRequest" },
            },
          },
        },
        responses: {
          201: addCollectionItemResponse,
          400: errorResponse("Corpo inválido", "ApiValidationError"),
          404: errorResponse("Carta não encontrada na TCGdex"),
          422: errorResponse("A carta não existe nesse finish ou em 1ª edição"),
          ...authErrors,
          ...tcgdexErrors,
        },
      },
    },
    "/collection/{id}": {
      patch: {
        tags: ["Collection"],
        summary: "Altera um item da própria coleção",
        description:
          "Só o dono pode alterar; ADMIN também recebe 403 em item de outra pessoa. A quantidade pode ser 0, mas não pode ficar abaixo da reservada em negociações somada às unidades em anúncios ACTIVE/PAUSED (RN-05). finish e firstEdition não mudam: para isso, apague e crie de novo. A condition não muda enquanto o item está numa negociação em andamento (troca aberta, oferta aberta ou aceita, anúncio ACTIVE/PAUSED); mandar a mesma condition que o item já tem passa.",
        security: [{ bearerAuth: [] }],
        parameters: [collectionItemIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCollectionItemRequest" },
            },
          },
        },
        responses: {
          200: collectionItemResponse("Item atualizado"),
          400: errorResponse("Corpo ou id inválido", "ApiValidationError"),
          403: errorResponse("O item pertence a outro usuário"),
          404: errorResponse("Item não encontrado"),
          409: errorResponse("Já existe outro item igual com essa condição, ou mudança de condição com o item numa troca aberta, numa oferta aberta ou aceita ou com anúncio aberto"),
          422: errorResponse("Quantidade abaixo da reservada ou das unidades anunciadas"),
          ...authErrors,
        },
      },
      delete: {
        tags: ["Collection"],
        summary: "Remove um item da própria coleção",
        description:
          "Só o dono pode remover. Item com anúncio ligado ou com unidades reservadas em negociações não pode ser apagado.",
        security: [{ bearerAuth: [] }],
        parameters: [collectionItemIdParam],
        responses: {
          204: { description: "Item removido" },
          400: errorResponse("Id inválido", "ApiValidationError"),
          403: errorResponse("O item pertence a outro usuário"),
          404: errorResponse("Item não encontrado"),
          409: errorResponse("O item tem anúncio ligado, unidades reservadas ou está numa oferta aberta ou aceita"),
          ...authErrors,
        },
      },
    },
    "/users/{username}/collection": {
      get: {
        tags: ["Users"],
        summary: "Coleção pública de um colecionador",
        description:
          "Rota pública, sem login. Mostra só os itens com isPublic = true e quantidade maior que 0, ordenados pelo nome da carta. Itens privados não aparecem nem para o próprio dono (ele vê tudo em GET /collection). Conta inativa, suspensa ou apagada responde 404.",
        security: [],
        parameters: [
          {
            name: "username",
            in: "path",
            required: true,
            description: "3 a 20 caracteres, apenas a-z, 0-9 e _",
            schema: { type: "string", pattern: "^[a-z0-9_]{3,20}$", example: "ash" },
          },
        ],
        responses: {
          200: {
            description: "Perfil e itens públicos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/PublicProfile" },
                        items: {
                          type: "array",
                          items: { $ref: "#/components/schemas/PublicCollectionItem" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse("Username fora do formato", "ApiValidationError"),
          404: errorResponse("Usuário não encontrado"),
          500: errorResponse("Erro interno"),
        },
      },
    },
    "/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "Lista a wishlist do usuário autenticado",
        description:
          "Traz as cartas desejadas, ordenadas pelo nome. opportunities é quantos outros usuários têm a carta em item público com unidade disponível (quantity > reservedQuantity). Contas apagadas, suspensas ou inativas não entram. A wishlist nunca altera a coleção.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Itens da wishlist",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: { $ref: "#/components/schemas/WishlistItem" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
      post: {
        tags: ["Wishlist"],
        summary: "Adiciona uma carta à wishlist",
        description:
          "Busca a carta na TCGdex (com cache), grava em Card e cria o item. Sem variante: quem quer a carta aceita qualquer versão. Carta que você já tem na coleção (quantidade maior que 0, em qualquer variante) não entra (RN-12). A coleção não muda.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddWishlistItemRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Item criado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        item: { $ref: "#/components/schemas/WishlistItem" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse("Corpo inválido", "ApiValidationError"),
          404: errorResponse("Carta não encontrada na TCGdex"),
          409: errorResponse("Esta carta já está na sua wishlist, ou você já tem esta carta na sua coleção (RN-12)"),
          ...authErrors,
          ...tcgdexErrors,
        },
      },
    },
    "/wishlist/{id}": {
      delete: {
        tags: ["Wishlist"],
        summary: "Remove um item da própria wishlist",
        description: "Só o dono pode remover; ADMIN também recebe 403 em item de outra pessoa.",
        security: [{ bearerAuth: [] }],
        parameters: [wishlistItemIdParam],
        responses: {
          204: { description: "Item removido" },
          400: errorResponse("Id inválido", "ApiValidationError"),
          403: errorResponse("O item pertence a outro usuário"),
          404: errorResponse("Item não encontrado"),
          ...authErrors,
        },
      },
    },
    "/listings": {
      get: {
        tags: ["Listings"],
        summary: "Vitrine de anúncios",
        description:
          "Anúncios ACTIVE. Não precisa de login. Donos com conta apagada, suspensa ou inativa não aparecem. Os filtros se somam (E). Exemplos: `?q=charizard`, `?q=charizard base`, `?type=Fire&condition=NEAR_MINT&sort=name`.",
        security: [],
        parameters: [
          {
            name: "cardId",
            in: "query",
            required: false,
            description: "Só anúncios desta carta (letras, números, ponto e hífen)",
            schema: { type: "string", pattern: "^[a-zA-Z0-9.\\-]+$", example: "base1-4" },
          },
          {
            name: "username",
            in: "query",
            required: false,
            description: "Só anúncios deste colecionador (3 a 20 caracteres, apenas a-z, 0-9 e _)",
            schema: { type: "string", pattern: "^[a-z0-9_]{3,20}$", example: "ash" },
          },
          {
            name: "q",
            in: "query",
            required: false,
            description:
              "Busca no nome da carta ou do set, sem diferenciar maiúscula. O texto é quebrado em palavras e cada palavra tem que aparecer no nome da carta ou no nome do set (\"charizard base\" acha o Charizard do Base Set).",
            schema: { type: "string", minLength: 1, maxLength: 50, example: "charizard base" },
          },
          {
            name: "condition",
            in: "query",
            required: false,
            description: "Estado do item anunciado (aceita minúsculas)",
            schema: {
              type: "string",
              enum: ["MINT", "NEAR_MINT", "EXCELLENT", "GOOD", "LIGHT_PLAYED", "PLAYED", "POOR"],
              example: "NEAR_MINT",
            },
          },
          {
            name: "finish",
            in: "query",
            required: false,
            description: "Acabamento do item anunciado (aceita minúsculas)",
            schema: { type: "string", enum: ["NORMAL", "HOLO", "REVERSE"], example: "HOLO" },
          },
          {
            name: "firstEdition",
            in: "query",
            required: false,
            description: "Só primeira edição (true) ou só as demais (false)",
            schema: { type: "string", enum: ["true", "false"] },
          },
          {
            name: "setId",
            in: "query",
            required: false,
            description: "Só cartas deste set (id exato)",
            schema: { type: "string", pattern: "^[a-zA-Z0-9.\\-]+$", maxLength: 30, example: "base1" },
          },
          {
            name: "type",
            in: "query",
            required: false,
            description: "Só cartas que têm este tipo. Aceita qualquer caixa (fire, FIRE)",
            schema: {
              type: "string",
              enum: ["Colorless", "Darkness", "Dragon", "Fairy", "Fighting", "Fire", "Grass", "Lightning", "Metal", "Psychic", "Water"],
              example: "Fire",
            },
          },
          {
            name: "rarity",
            in: "query",
            required: false,
            description: "Só cartas desta raridade, sem diferenciar maiúscula (rare acha Rare)",
            schema: { type: "string", maxLength: 50, example: "Rare" },
          },
          {
            name: "sort",
            in: "query",
            required: false,
            description: "recent: mais recentes primeiro; oldest: mais antigos primeiro; name: nome da carta (A-Z)",
            schema: { type: "string", enum: ["recent", "oldest", "name"], default: "recent" },
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: listingListResponse("Anúncios ativos", true),
          400: errorResponse("Filtro ou paginação inválidos", "ApiValidationError"),
          500: errorResponse("Erro interno"),
        },
      },
      post: {
        tags: ["Listings"],
        summary: "Anuncia um item da própria coleção para troca",
        description:
          "RN-05: o item tem que ser do usuário, e quantity somada aos outros anúncios ACTIVE/PAUSED do mesmo item não pode passar do disponível (quantity - reservedQuantity). O anúncio não reserva unidades. Item privado (isPublic false) pode ser anunciado.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateListingRequest" },
            },
          },
        },
        responses: {
          201: listingResponse("Anúncio criado"),
          400: errorResponse("Corpo inválido", "ApiValidationError"),
          403: errorResponse("O item pertence a outro usuário"),
          404: errorResponse("Item da coleção não encontrado"),
          422: errorResponse("Quantidade acima do disponível (RN-05)"),
          ...authErrors,
        },
      },
    },
    "/listings/me": {
      get: {
        tags: ["Listings"],
        summary: "Anúncios do usuário autenticado",
        description: "Todos os status (ACTIVE, PAUSED, CLOSED, BLOCKED), mais recentes primeiro.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: listingListResponse("Anúncios do usuário", false),
          ...authErrors,
        },
      },
    },
    "/listings/{id}": {
      get: {
        tags: ["Listings"],
        summary: "Um anúncio",
        description:
          "Login opcional. ACTIVE aparece para qualquer um; os outros status só para o dono ou ADMIN (senão 404).",
        security: [{}, { bearerAuth: [] }],
        parameters: [listingIdParam],
        responses: {
          200: listingResponse("Anúncio"),
          400: errorResponse("Id inválido", "ApiValidationError"),
          401: errorResponse("Token enviado, mas inválido ou expirado"),
          404: errorResponse("Anúncio não encontrado"),
          500: errorResponse("Erro interno"),
        },
      },
      patch: {
        tags: ["Listings"],
        summary: "Altera um anúncio",
        description:
          "Dono: quantity, description e status (ACTIVE, PAUSED, CLOSED). ADMIN: só status, para BLOCKED ou de BLOCKED para PAUSED. CLOSED é final. Aumentar quantity ou sair de BLOCKED revalida a RN-05. Fechar (CLOSED) ou bloquear (BLOCKED) cancela as ofertas PROPOSED do anúncio e as ACCEPTED que ainda não viraram troca, soltando as cartas oferecidas. Diminuir quantity cancela as ACCEPTED sem troca que pedem mais do que a nova quantidade (cada uma comparada sozinha). Pausar não mexe nelas. Oferta que já virou troca não muda. Desbloquear não reabre ofertas canceladas.",
        security: [{ bearerAuth: [] }],
        parameters: [listingIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateListingRequest" },
            },
          },
        },
        responses: {
          200: listingResponse("Anúncio alterado"),
          400: errorResponse("Corpo ou id inválido", "ApiValidationError"),
          403: errorResponse("Anúncio de outro usuário, bloqueado pela moderação, ou ADMIN mudando quantidade/descrição"),
          404: errorResponse("Anúncio não encontrado"),
          422: errorResponse("Anúncio fechado, transição de status não permitida ou quantidade acima do disponível"),
          ...authErrors,
        },
      },
    },
    "/listings/{id}/offers": {
      post: {
        tags: ["Offers"],
        summary: "Faz uma oferta de troca num anúncio",
        description:
          "Diz quantas cartas do anúncio quer (quantity) e quais cartas da própria coleção dá em troca (items). O anúncio tem que estar ACTIVE e ser de outro usuário. Cada item oferecido tem que ser do proponente e caber no disponível (quantity - reservedQuantity). Só uma oferta PROPOSED por proponente em cada anúncio. A oferta não reserva unidades.",
        security: [{ bearerAuth: [] }],
        parameters: [listingIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOfferRequest" },
            },
          },
        },
        responses: {
          201: offerResponse("Oferta criada"),
          400: errorResponse("Corpo inválido: items vazio, mais de 20, item repetido ou campo extra", "ApiValidationError"),
          403: errorResponse("Item oferecido pertence a outro usuário"),
          404: errorResponse("Anúncio inexistente ou que não aceita ofertas (pausado, fechado, bloqueado), ou item oferecido inexistente"),
          409: errorResponse("Você já tem uma oferta aberta neste anúncio"),
          422: errorResponse("Oferta no próprio anúncio, quantidade acima da do anúncio ou item oferecido acima do disponível"),
          ...authErrors,
        },
      },
    },
    "/offers/me": {
      get: {
        tags: ["Offers"],
        summary: "Ofertas feitas e recebidas pelo usuário autenticado",
        description: "sent: ofertas que o usuário fez. received: ofertas nos anúncios dele. Mais recentes primeiro.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            description: "Só ofertas neste status",
            schema: { type: "string", enum: offerStatuses },
          },
        ],
        responses: {
          200: {
            description: "Ofertas do usuário",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        sent: { type: "array", items: { $ref: "#/components/schemas/Offer" } },
                        received: { type: "array", items: { $ref: "#/components/schemas/Offer" } },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse("Status inválido", "ApiValidationError"),
          ...authErrors,
        },
      },
    },
    "/offers/{id}": {
      get: {
        tags: ["Offers"],
        summary: "Uma oferta",
        description: "Só o proponente ou o dono do anúncio veem a oferta. Para os outros (inclusive ADMIN), 404.",
        security: [{ bearerAuth: [] }],
        parameters: [offerIdParam],
        responses: {
          200: offerResponse("Oferta"),
          400: errorResponse("Id inválido", "ApiValidationError"),
          404: errorResponse("Oferta não encontrada"),
          ...authErrors,
        },
      },
    },
    "/offers/{id}/status": {
      patch: {
        tags: ["Offers"],
        summary: "Aceita, recusa ou cancela uma oferta",
        description:
          "RN-06: só o dono do anúncio aceita (ACCEPTED) ou recusa (REJECTED); só o proponente cancela (CANCELED). Oferta finalizada não muda mais de status nem volta para PROPOSED, com uma exceção: oferta ACCEPTED que ainda não virou troca pode ser recusada pelo dono (REJECTED) ou cancelada por quem ofertou (CANCELED); se já virou troca, dá 409 e quem age é a troca (POST /trades/{id}/reject ou /cancel). Recusar ou cancelar apaga os itens oferecidos (items vem vazio). Aceitar exige o anúncio ACTIVE e confere de novo se a oferta ainda dá para cumprir: o anúncio tem a quantidade pedida e quem ofertou ainda tem as cartas oferecidas disponíveis. Aceitar só muda o status: depois, quem ofertou cria a troca em POST /trades.",
        security: [{ bearerAuth: [] }],
        parameters: [offerIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateOfferStatusRequest" },
            },
          },
        },
        responses: {
          200: offerResponse("Status alterado"),
          400: errorResponse("Corpo ou id inválido (inclui status PROPOSED)", "ApiValidationError"),
          403: errorResponse("Não participa da oferta (inclui ADMIN) ou papel errado para o status"),
          404: errorResponse("Oferta não encontrada"),
          409: errorResponse("Oferta aceita que já virou troca"),
          422: errorResponse("Oferta já finalizada (RN-06); no aceite, anúncio fora de ACTIVE, anúncio com menos unidades do que a oferta pede ou carta oferecida que não está mais disponível"),
          ...authErrors,
        },
      },
    },
    "/trades": {
      post: {
        tags: ["Trades"],
        summary: "Cria a troca a partir de uma oferta aceita",
        description:
          "Só quem fez a oferta cria a troca, depois que o dono do anúncio aceitou (PATCH /offers/{id}/status). Na mesma transação: as cartas dos dois lados ficam reservadas (reservedQuantity), os itens da oferta passam para a troca (a oferta fica ACCEPTED e com items vazio), o anúncio baixa a quantidade da oferta (se chegar a 0, fecha e cancela as ofertas abertas dele) e anúncios abertos de quem ofertou que ficarem acima do disponível são reduzidos ou fechados. Em cada anúncio que fecha ou diminui, as ofertas ACCEPTED que ainda não viraram troca e não cabem mais (anúncio fechado, ou oferta pedindo mais do que sobrou) viram CANCELED e soltam as cartas oferecidas. O anúncio pode estar ACTIVE ou PAUSED.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTradeRequest" },
            },
          },
        },
        responses: {
          201: tradeResponse("Troca criada"),
          400: errorResponse("Corpo inválido: offerId ausente, não uuid ou campo extra", "ApiValidationError"),
          403: errorResponse("Quem chamou é o dono do anúncio: só quem fez a oferta cria a troca"),
          404: errorResponse("Oferta não encontrada ou de outros usuários"),
          409: errorResponse("Esta oferta já virou troca"),
          422: errorResponse("Oferta não está ACCEPTED, anúncio fechado ou bloqueado, anúncio com menos unidades do que a oferta pede ou cartas oferecidas que não estão mais disponíveis"),
          ...authErrors,
        },
      },
    },
    "/trades/me": {
      get: {
        tags: ["Trades"],
        summary: "Trocas do usuário autenticado",
        description: "sent: trocas em que o usuário fez a oferta. received: trocas dos anúncios dele. Mais recentes primeiro.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            description: "Só trocas neste status",
            schema: { type: "string", enum: tradeStatuses },
          },
        ],
        responses: {
          200: {
            description: "Trocas do usuário",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        sent: { type: "array", items: { $ref: "#/components/schemas/Trade" } },
                        received: { type: "array", items: { $ref: "#/components/schemas/Trade" } },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse("Status inválido", "ApiValidationError"),
          ...authErrors,
        },
      },
    },
    "/trades/{id}": {
      get: {
        tags: ["Trades"],
        summary: "Uma troca",
        description: "Só as duas partes veem a troca. Para os outros (inclusive ADMIN), 403.",
        security: [{ bearerAuth: [] }],
        parameters: [tradeIdParam],
        responses: {
          200: tradeResponse("Troca"),
          400: errorResponse("Id inválido", "ApiValidationError"),
          403: errorResponse("Esta troca é de outros usuários"),
          404: errorResponse("Troca não encontrada"),
          ...authErrors,
        },
      },
    },
    "/trades/{id}/accept": {
      post: {
        tags: ["Trades"],
        summary: "Conclui a troca (RN-07)",
        description:
          "Só o dono do anúncio. Numa transação só: trava os itens, confere de novo que cada carta ainda é de quem entrega e tem quantidade e reserva suficientes, tira as cartas de quem entrega (quantity e reservedQuantity juntas) e soma em quem recebe (no item igual: carta, condição, acabamento e 1ª edição; se não houver, cria um item público). Cada carta recebida sai da wishlist de quem recebe (RN-11). Qualquer erro no meio desfaz tudo. Quem entrega fica com o item, mesmo que chegue a 0.",
        security: [{ bearerAuth: [] }],
        parameters: [tradeIdParam],
        responses: {
          200: tradeResponse("Troca concluída (ACCEPTED, completedAt preenchido)"),
          ...tradeActionErrors("quem chamou fez a oferta"),
          422: errorResponse("As cartas desta troca não estão mais disponíveis"),
        },
      },
    },
    "/trades/{id}/reject": {
      post: {
        tags: ["Trades"],
        summary: "Recusa a troca",
        description: "Só o dono do anúncio. Libera a reserva dos dois lados. Os anúncios reduzidos quando a troca nasceu não voltam. A oferta continua ACCEPTED e não gera outra troca.",
        security: [{ bearerAuth: [] }],
        parameters: [tradeIdParam],
        responses: {
          200: tradeResponse("Troca recusada (REJECTED)"),
          ...tradeActionErrors("quem chamou fez a oferta"),
        },
      },
    },
    "/trades/{id}/cancel": {
      post: {
        tags: ["Trades"],
        summary: "Cancela a troca",
        description: "Só quem fez a oferta. Libera a reserva dos dois lados. Os anúncios reduzidos quando a troca nasceu não voltam. A oferta continua ACCEPTED e não gera outra troca.",
        security: [{ bearerAuth: [] }],
        parameters: [tradeIdParam],
        responses: {
          200: tradeResponse("Troca cancelada (CANCELED)"),
          ...tradeActionErrors("quem chamou é o dono do anúncio"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Token devolvido por /auth/login ou /auth/register. Enviar como: Authorization: Bearer <token>",
      },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["username", "name", "email", "password"],
        properties: {
          username: {
            type: "string",
            pattern: "^[a-z0-9_]{3,20}$",
            description:
              "Identificador público, usado na URL do perfil. Só minúsculas, números e underscore.",
            example: "brock",
          },
          name: {
            type: "string",
            minLength: 2,
            maxLength: 120,
            example: "Brock Harrison",
          },
          email: {
            type: "string",
            format: "email",
            description: "Normalizado para minúsculas.",
            example: "brock@pokebox.dev",
          },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 72,
            description: "O limite de 72 é do bcrypt, que trunca acima disso.",
            example: "pokebox123",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "ash@pokebox.dev",
          },
          password: { type: "string", example: "pokebox123" },
        },
      },
      UpdateUserRequest: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        description:
          "Todos os campos são opcionais, mas ao menos um deve ser enviado. Use null para limpar um campo.",
        properties: {
          name: {
            type: "string",
            minLength: 2,
            maxLength: 120,
            example: "Ash Ketchum",
          },
          phone: {
            type: "string",
            nullable: true,
            pattern: "^\\d{10,11}$",
            description: "Com DDD, só números.",
            example: "85999998888",
          },
          cep: {
            type: "string",
            nullable: true,
            pattern: "^\\d{8}$",
            description: "8 dígitos, só números.",
            example: "60000000",
          },
          street: { type: "string", nullable: true, maxLength: 150 },
          number: { type: "string", nullable: true, maxLength: 10 },
          complement: { type: "string", nullable: true, maxLength: 100 },
          neighborhood: { type: "string", nullable: true, maxLength: 100 },
          city: { type: "string", nullable: true, maxLength: 100 },
          state: {
            type: "string",
            nullable: true,
            pattern: "^[A-Za-z]{2}$",
            description: "Sigla do estado.",
            example: "CE",
          },
        },
      },
      AuthUser: {
        type: "object",
        description:
          "Dados públicos do usuário. O hash da senha nunca é retornado.",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "f323730d-c965-42b2-b3f4-a059e009dfe7",
          },
          username: { type: "string", example: "ash" },
          name: { type: "string", example: "Ash Ketchum" },
          email: {
            type: "string",
            format: "email",
            example: "ash@pokebox.dev",
          },
          role: { type: "string", enum: ["USER", "ADMIN"], example: "USER" },
          accountStatus: {
            type: "string",
            enum: ["PENDING_VERIFICATION", "ACTIVE", "INACTIVE", "SUSPENDED"],
            example: "ACTIVE",
          },
          createdAt: { type: "string", format: "date-time" },
          phone: nullableString,
          cep: nullableString,
          street: nullableString,
          number: nullableString,
          complement: nullableString,
          neighborhood: nullableString,
          city: nullableString,
          state: nullableString,
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/AuthUser" },
              token: {
                type: "string",
                description:
                  "JWT válido por 1 dia. Carrega apenas o id do usuário.",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
            },
          },
        },
      },
      ApiError: {
        type: "object",
        description: "Formato único de erro da API.",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "E-mail ou senha inválidos" },
        },
      },
      ApiValidationError: {
        type: "object",
        description:
          "Erro de validação. Todos os campos inválidos vêm de uma vez.",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Dados inválidos" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "username" },
                message: {
                  type: "string",
                  example: "username: 3 a 20 caracteres, apenas a-z, 0-9 e _",
                },
              },
            },
          },
        },
      },
      CardSummary: {
        type: "object",
        properties: {
          id: { type: "string", example: "base1-4" },
          localId: { type: "string", example: "4" },
          number: { type: "string", example: "4", description: "Número da carta no set (igual ao localId)" },
          name: { type: "string", example: "Charizard" },
          set: {
            type: "object",
            nullable: true,
            description: "Set da carta, descoberto pelo id. null se o set não estiver na lista da TCGdex",
            properties: {
              id: { type: "string", example: "base1" },
              name: { type: "string", example: "Base Set" },
            },
          },
          image: {
            type: "object",
            properties: { small: nullableString, large: nullableString },
          },
        },
      },
      CardListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/CardSummary" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 20 },
              hasNextPage: { type: "boolean" },
            },
          },
          search: {
            type: "object",
            description: "Como a busca foi entendida. Só aparece quando há name",
            properties: {
              name: { ...nullableString, example: "charizard", description: "Palavras usadas para procurar no nome; null se a busca foi só por set ou nada foi achado" },
              sets: { type: "array", items: { type: "string" }, example: ["Base Set", "Base Set 2", "Expedition Base Set"] },
              ignored: { type: "array", items: { type: "string" }, example: ["pipi", "popo"], description: "Palavras que não trouxeram nenhuma carta" },
            },
          },
        },
      },
      CardDetails: {
        type: "object",
        properties: {
          id: { type: "string", example: "base1-4" },
          name: { type: "string", example: "Charizard" },
          number: { type: "string", example: "4/102" },
          rarity: nullableString,
          illustrator: nullableString,
          category: { type: "string", example: "Pokemon" },
          image: {
            type: "object",
            properties: { small: nullableString, large: nullableString },
          },
          set: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              logo: nullableString,
              symbol: nullableString,
              series: { type: "string", nullable: true, example: "Base" },
              releaseDate: { type: "string", format: "date", nullable: true, example: "1999-01-09" },
            },
          },
          hp: { type: "integer", nullable: true, example: 120 },
          types: {
            type: "array",
            items: { type: "string" },
            example: ["Fire"],
          },
          stage: nullableString,
          evolveFrom: nullableString,
          description: nullableString,
          abilities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                effect: { type: "string" },
              },
            },
          },
          attacks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                cost: { type: "array", items: { type: "string" } },
                damage: nullableString,
                effect: nullableString,
              },
            },
          },
          weaknesses: { type: "array", items: typeValue },
          resistances: { type: "array", items: typeValue },
          retreat: { type: "integer", nullable: true },
          dexId: { type: "array", items: { type: "integer" }, example: [6] },
          regulationMark: { type: "string", nullable: true, example: "G" },
          legal: {
            type: "object",
            properties: {
              standard: { type: "boolean" },
              expanded: { type: "boolean" },
            },
          },
          trainerType: { type: "string", nullable: true, example: "Item" },
          energyType: { type: "string", nullable: true, example: "Normal" },
          variants: {
            type: "object",
            properties: {
              normal: { type: "boolean" },
              reverse: { type: "boolean" },
              holo: { type: "boolean" },
              firstEdition: { type: "boolean" },
            },
          },
          marketPrice: {
            type: "object",
            nullable: true,
            properties: {
              source: { type: "string", enum: ["tcgplayer", "cardmarket"] },
              value: { type: "number", example: 390 },
              currency: { type: "string", example: "USD" },
              updatedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                description: "Data do preço na fonte (TCGplayer ou Cardmarket).",
              },
            },
          },
        },
      },
      CardUserInfo: {
        type: "object",
        nullable: true,
        description: "Dados do usuário logado sobre a carta. null quando não há login.",
        properties: {
          inCollection: {
            type: "integer",
            minimum: 0,
            example: 3,
            description: "Soma de quantity de todos os seus itens de coleção com essa carta (todas as condições e variantes, públicos e privados, inclusive unidades reservadas).",
          },
          inWishlist: { type: "boolean", example: false, description: "A carta está na sua wishlist." },
          onTradeList: { type: "boolean", example: true, description: "Você tem anúncio ACTIVE dessa carta (PAUSED não conta)." },
        },
      },
      Listing: {
        type: "object",
        description: "Anúncio de troca. Nunca traz userId, e-mail, reservedQuantity nem isPublic.",
        properties: {
          id: { type: "string", format: "uuid" },
          quantity: { type: "integer", minimum: 1, example: 1 },
          description: { type: "string", nullable: true, example: "Charizard Base Set 1ª edição, sem marcas na frente." },
          status: { type: "string", enum: listingStatuses, example: "ACTIVE" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          owner: {
            type: "object",
            properties: {
              username: { type: "string", example: "ash" },
              name: { type: "string", example: "Ash Ketchum" },
            },
          },
          item: {
            type: "object",
            description: "Item da coleção que lastreia o anúncio.",
            properties: {
              id: { type: "string", format: "uuid" },
              condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
              finish: { type: "string", enum: cardFinishes, example: "HOLO" },
              firstEdition: { type: "boolean", example: true },
            },
          },
          card: { $ref: "#/components/schemas/StoredCard" },
        },
      },
      Offer: {
        type: "object",
        description: "Oferta de troca. Nunca traz userId, proposerId, e-mail, reservedQuantity nem isPublic.",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { type: "string", enum: offerStatuses, example: "PROPOSED" },
          quantity: { type: "integer", minimum: 1, description: "Quantas cartas do anúncio o proponente quer", example: 1 },
          message: { type: "string", nullable: true, example: "Troco meu Mew holo pelo seu Charizard?" },
          createdAt: { type: "string", format: "date-time" },
          respondedAt: { type: "string", format: "date-time", nullable: true, description: "null enquanto PROPOSED" },
          proposer: {
            type: "object",
            properties: {
              username: { type: "string", example: "misty" },
              name: { type: "string", example: "Misty Waterflower" },
            },
          },
          listing: { $ref: "#/components/schemas/Listing" },
          items: {
            type: "array",
            description: "Cartas oferecidas em troca. Vazio quando a oferta foi recusada, cancelada ou já virou troca (os itens passam para a troca).",
            items: {
              type: "object",
              properties: {
                collectionItemId: { type: "string", format: "uuid" },
                quantity: { type: "integer", minimum: 1, example: 1 },
                condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
                finish: { type: "string", enum: cardFinishes, example: "HOLO" },
                firstEdition: { type: "boolean", example: false },
                card: { $ref: "#/components/schemas/StoredCard" },
              },
            },
          },
        },
      },
      CreateOfferRequest: {
        type: "object",
        required: ["quantity", "items"],
        additionalProperties: false,
        properties: {
          quantity: { type: "integer", minimum: 1, example: 1 },
          message: { type: "string", maxLength: 500, example: "Troco meu Mew holo pelo seu Charizard?" },
          items: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            description: "Cada collectionItemId só pode aparecer uma vez.",
            items: {
              type: "object",
              required: ["collectionItemId", "quantity"],
              additionalProperties: false,
              properties: {
                collectionItemId: { type: "string", format: "uuid", description: "Item da sua coleção (pegue em GET /collection)" },
                quantity: { type: "integer", minimum: 1, example: 1 },
              },
            },
          },
        },
      },
      UpdateOfferStatusRequest: {
        type: "object",
        required: ["status"],
        additionalProperties: false,
        properties: {
          status: {
            type: "string",
            enum: ["ACCEPTED", "REJECTED", "CANCELED"],
            description: "Dono do anúncio: ACCEPTED ou REJECTED. Proponente: CANCELED.",
          },
        },
      },
      Trade: {
        type: "object",
        description: "Troca. Nunca traz userId, e-mail, reservedQuantity nem isPublic. A carta de cada item vem da cópia guardada na troca.",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { type: "string", enum: tradeStatuses, example: "PROPOSED" },
          createdAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true, description: "Preenchido só quando ACCEPTED" },
          offerId: { type: "string", format: "uuid", nullable: true },
          proposer: {
            type: "object",
            description: "Quem fez a oferta",
            properties: {
              username: { type: "string", example: "misty" },
              name: { type: "string", example: "Misty Waterflower" },
            },
          },
          recipient: {
            type: "object",
            description: "Dono do anúncio",
            properties: {
              username: { type: "string", example: "ash" },
              name: { type: "string", example: "Ash Ketchum" },
            },
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string", description: "username de quem entrega", example: "ash" },
                to: { type: "string", description: "username de quem recebe", example: "misty" },
                quantity: { type: "integer", minimum: 1, example: 1 },
                condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
                finish: { type: "string", enum: cardFinishes, example: "HOLO" },
                firstEdition: { type: "boolean", example: true },
                card: { $ref: "#/components/schemas/StoredCard" },
              },
            },
          },
        },
      },
      CreateTradeRequest: {
        type: "object",
        required: ["offerId"],
        additionalProperties: false,
        properties: {
          offerId: { type: "string", format: "uuid", description: "Oferta ACCEPTED feita por quem chama (pegue em GET /offers/me?status=ACCEPTED, em sent)" },
        },
      },
      CreateListingRequest: {
        type: "object",
        required: ["collectionItemId", "quantity"],
        additionalProperties: false,
        properties: {
          collectionItemId: { type: "string", format: "uuid", description: "Item da sua coleção (pegue em GET /collection)" },
          quantity: { type: "integer", minimum: 1, example: 1 },
          description: { type: "string", maxLength: 500, example: "Charizard Base Set 1ª edição, sem marcas na frente." },
        },
      },
      UpdateListingRequest: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          quantity: { type: "integer", minimum: 1, example: 2 },
          description: { type: "string", nullable: true, maxLength: 500 },
          status: {
            type: "string",
            enum: listingStatuses,
            description: "Dono: ACTIVE, PAUSED ou CLOSED. ADMIN: BLOCKED, ou PAUSED para desbloquear.",
          },
        },
      },
      StoredCard: {
        type: "object",
        description: "Carta gravada no banco quando entra na coleção de alguém.",
        properties: {
          id: { type: "string", example: "base1-4" },
          name: { type: "string", example: "Charizard" },
          setId: { type: "string", example: "base1" },
          setName: { type: "string", example: "Base Set" },
          setSeries: nullableString,
          releaseDate: { type: "string", format: "date-time", nullable: true },
          number: { type: "string", example: "4/102" },
          rarity: nullableString,
          imageUrl: nullableString,
          category: nullableString,
          types: { type: "array", items: { type: "string" } },
          hp: { type: "integer", nullable: true },
          stage: nullableString,
          illustrator: nullableString,
          dexId: { type: "array", items: { type: "integer" } },
          regulationMark: nullableString,
          trainerType: nullableString,
          energyType: nullableString,
          marketPrice: {
            type: "number",
            nullable: true,
            description: "Preço de referência da TCGdex, só para comparar cartas numa troca. Não é preço de venda.",
            example: 312.5,
          },
          marketPriceCurrency: { type: "string", nullable: true, example: "USD" },
          marketPriceSource: {
            type: "string",
            nullable: true,
            enum: ["tcgplayer", "cardmarket"],
            example: "tcgplayer",
          },
          marketPriceUpdatedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Data do preço na fonte (TCGplayer ou Cardmarket), informada pela TCGdex. Não é a data em que a carta entrou na coleção.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CollectionItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          cardId: { type: "string", example: "base1-4" },
          quantity: { type: "integer", minimum: 0, example: 1 },
          reservedQuantity: {
            type: "integer",
            minimum: 0,
            description: "Unidades presas em negociações em andamento.",
            example: 0,
          },
          available: {
            type: "integer",
            description: "quantity - reservedQuantity",
            example: 1,
          },
          condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
          finish: { type: "string", enum: cardFinishes, example: "HOLO" },
          firstEdition: { type: "boolean", example: true },
          isPublic: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          card: { $ref: "#/components/schemas/StoredCard" },
        },
      },
      PublicProfile: {
        type: "object",
        properties: {
          username: { type: "string", example: "ash" },
          name: { type: "string", example: "Ash Ketchum" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PublicCollectionItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          quantity: { type: "integer", minimum: 1, example: 1 },
          condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
          finish: { type: "string", enum: cardFinishes, example: "HOLO" },
          firstEdition: { type: "boolean", example: true },
          card: { $ref: "#/components/schemas/StoredCard" },
        },
      },
      CreateCollectionItemRequest: {
        type: "object",
        required: ["cardId", "quantity", "finish", "firstEdition"],
        additionalProperties: false,
        properties: {
          cardId: { type: "string", description: "ID da carta na TCGdex", example: "sv01-001" },
          quantity: { type: "integer", minimum: 1, example: 1 },
          condition: {
            type: "string",
            enum: cardConditions,
            default: "NEAR_MINT",
          },
          finish: { type: "string", enum: cardFinishes, example: "NORMAL" },
          firstEdition: { type: "boolean", example: false },
          isPublic: { type: "boolean", default: true },
        },
      },
      UpdateCollectionItemRequest: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        description: "Todos os campos são opcionais, mas ao menos um deve ser enviado.",
        properties: {
          quantity: { type: "integer", minimum: 0, example: 3 },
          condition: { type: "string", enum: cardConditions },
          isPublic: { type: "boolean" },
        },
      },
      WishlistItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          cardId: { type: "string", example: "base1-4" },
          createdAt: { type: "string", format: "date-time" },
          opportunities: {
            type: "integer",
            minimum: 0,
            description:
              "Quantos outros usuários têm a carta em item público com unidade disponível. Contas apagadas, suspensas ou inativas não entram.",
            example: 1,
          },
          card: { $ref: "#/components/schemas/StoredCard" },
        },
      },
      AddWishlistItemRequest: {
        type: "object",
        required: ["cardId"],
        additionalProperties: false,
        properties: {
          cardId: { type: "string", description: "ID da carta na TCGdex", example: "sv01-001" },
        },
      },
      CardDetailsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              card: { $ref: "#/components/schemas/CardDetails" },
              user: { $ref: "#/components/schemas/CardUserInfo" },
              listings: {
                type: "array",
                items: { $ref: "#/components/schemas/Listing" },
              },
            },
          },
        },
      },
    },
  },
};
