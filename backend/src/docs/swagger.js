import { CardCondition, CardFinish, ListingStatus, OfferStatus } from "../generated/prisma/index.js";
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

const collectionItemIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID do item da coleção",
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
  description: "ID do anúncio",
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

const offerIdParam = {
  name: "id",
  in: "path",
  required: true,
  description: "ID da oferta",
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

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "PokeBox API",
    version: "1.0.0",
    description: "API do PokeBox",
  },
  servers: [
    {
      url: `http://localhost:${process.env.BACKEND_PORT ?? process.env.PORT ?? 3000}`,
    },
  ],
  tags: [
    { name: "Auth", description: "Cadastro, login e sessão" },
    { name: "User", description: "Perfil do usuário autenticado" },
    { name: "Cards", description: "Cartas (TCGdex + cache)" },
    { name: "Collection", description: "Coleção do usuário autenticado" },
    { name: "Users", description: "Perfil público dos colecionadores" },
    { name: "Wishlist", description: "Cartas que o usuário autenticado quer ter" },
    { name: "Listings", description: "Anúncios de troca (RN-05: só anuncia o que tem)" },
    { name: "Offers", description: "Ofertas de troca em anúncios (RN-06: oferta finalizada não volta para PROPOSED)" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Cadastra um novo usuário",
        description:
          "Cria a conta e já devolve um token válido. A senha é gravada com hash bcrypt e nunca retorna na resposta.",
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
          "Em caso de credencial inválida a resposta é a mesma para e-mail inexistente e senha errada, de propósito: mensagens diferentes permitiriam descobrir quais e-mails estão cadastrados.",
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
          "Lista paginada de cartas da TCGdex, com busca opcional por nome. Cache em memória de 10 min.",
        parameters: [
          {
            name: "name",
            in: "query",
            required: false,
            description: "Busca por nome (aceita parte do nome)",
            schema: { type: "string", maxLength: 50, example: "charizard" },
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
        },
      },
    },
    "/cards/{id}": {
      get: {
        tags: ["Cards"],
        summary: "Detalhes de uma carta",
        description:
          "Busca na memória (1h), depois no banco (24h) e por último na API TCGdex.",
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
          langParam,
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
          "Busca a carta na TCGdex (com cache), grava em Card e cria o item. Se o usuário já tem a mesma carta com a mesma condição, finish e 1ª edição, soma a quantidade no item existente. finish e firstEdition são conferidos contra as variantes da carta; se a TCGdex não informar nenhuma variante, a conferência é ignorada.",
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
          201: collectionItemResponse("Item criado ou quantidade somada"),
          400: errorResponse("Corpo inválido", "ApiValidationError"),
          404: errorResponse("Carta não encontrada na TCGdex"),
          422: errorResponse("A carta não existe nesse finish ou em 1ª edição"),
          ...authErrors,
        },
      },
    },
    "/collection/{id}": {
      patch: {
        tags: ["Collection"],
        summary: "Altera um item da própria coleção",
        description:
          "Só o dono pode alterar; ADMIN também recebe 403 em item de outra pessoa. A quantidade pode ser 0, mas não pode ficar abaixo da reservada em negociações somada às unidades em anúncios ACTIVE/PAUSED (RN-05). finish e firstEdition não mudam: para isso, apague e crie de novo.",
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
          409: errorResponse("Já existe outro item igual com essa condição"),
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
          409: errorResponse("O item tem anúncio ligado ou unidades reservadas"),
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
          "Busca a carta na TCGdex (com cache), grava em Card e cria o item. Sem variante: quem quer a carta aceita qualquer versão. Ter a carta na coleção não impede pôr na wishlist, e a coleção não muda.",
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
          409: errorResponse("Esta carta já está na sua wishlist"),
          ...authErrors,
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
          "Anúncios ACTIVE, mais recentes primeiro. Não precisa de login. Donos com conta apagada, suspensa ou inativa não aparecem.",
        parameters: [
          {
            name: "cardId",
            in: "query",
            required: false,
            description: "Só anúncios desta carta",
            schema: { type: "string", example: "base1-4" },
          },
          {
            name: "username",
            in: "query",
            required: false,
            description: "Só anúncios deste colecionador",
            schema: { type: "string", example: "ash" },
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
          "Dono: quantity, description e status (ACTIVE, PAUSED, CLOSED). ADMIN: só status, para BLOCKED ou de BLOCKED para PAUSED. CLOSED é final. Aumentar quantity ou sair de BLOCKED revalida a RN-05. Fechar (CLOSED) ou bloquear (BLOCKED) cancela as ofertas PROPOSED do anúncio e solta as cartas oferecidas; pausar não mexe nelas. Desbloquear não reabre ofertas canceladas.",
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
          "RN-06: só o dono do anúncio aceita (ACCEPTED) ou recusa (REJECTED); só o proponente cancela (CANCELED). Oferta finalizada não muda mais de status nem volta para PROPOSED. Recusar ou cancelar apaga os itens oferecidos (items vem vazio). Aceitar exige o anúncio ACTIVE e, por enquanto, só muda o status: a troca nasce na #18.",
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
          422: errorResponse("Oferta já finalizada (RN-06) ou anúncio que não está ACTIVE no aceite"),
          ...authErrors,
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
            example: "ash_ketchum",
          },
          name: {
            type: "string",
            minLength: 2,
            maxLength: 120,
            example: "Ash Ketchum",
          },
          email: {
            type: "string",
            format: "email",
            description: "Normalizado para minúsculas.",
            example: "ash@pokebox.com",
          },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 72,
            description: "O limite de 72 é do bcrypt, que trunca acima disso.",
            example: "senhaForte123",
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
            example: "ash@pokebox.com",
          },
          password: { type: "string", example: "senhaForte123" },
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
          username: { type: "string", example: "ash_ketchum" },
          name: { type: "string", example: "Ash Ketchum" },
          email: {
            type: "string",
            format: "email",
            example: "ash@pokebox.com",
          },
          role: { type: "string", enum: ["USER", "ADMIN"], example: "USER" },
          accountStatus: {
            type: "string",
            enum: ["PENDING_VERIFICATION", "ACTIVE", "INACTIVE", "SUSPENDED"],
            example: "PENDING_VERIFICATION",
          },
          createdAt: { type: "string", format: "date-time" },
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
          name: { type: "string", example: "Charizard" },
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
        description: "null quando o usuário não está logado",
        properties: {
          inCollection: { type: "integer" },
          inWishlist: { type: "boolean" },
          onTradeList: { type: "boolean" },
        },
      },
      Listing: {
        type: "object",
        description: "Anúncio de troca. Nunca traz userId, e-mail, reservedQuantity nem isPublic.",
        properties: {
          id: { type: "string", format: "uuid" },
          quantity: { type: "integer", minimum: 1, example: 1 },
          description: { type: "string", nullable: true, example: "Troco por Blastoise" },
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
              firstEdition: { type: "boolean", example: false },
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
            description: "Cartas oferecidas em troca. Vazio quando a oferta foi recusada ou cancelada.",
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
                collectionItemId: { type: "string", format: "uuid" },
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
      CreateListingRequest: {
        type: "object",
        required: ["collectionItemId", "quantity"],
        additionalProperties: false,
        properties: {
          collectionItemId: { type: "string", format: "uuid" },
          quantity: { type: "integer", minimum: 1, example: 1 },
          description: { type: "string", maxLength: 500, example: "Troco por Blastoise" },
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
          quantity: { type: "integer", minimum: 0, example: 2 },
          reservedQuantity: {
            type: "integer",
            minimum: 0,
            description: "Unidades presas em negociações em andamento.",
            example: 0,
          },
          available: {
            type: "integer",
            description: "quantity - reservedQuantity",
            example: 2,
          },
          condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
          finish: { type: "string", enum: cardFinishes, example: "HOLO" },
          firstEdition: { type: "boolean", example: false },
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
          quantity: { type: "integer", minimum: 1, example: 2 },
          condition: { type: "string", enum: cardConditions, example: "NEAR_MINT" },
          finish: { type: "string", enum: cardFinishes, example: "HOLO" },
          firstEdition: { type: "boolean", example: false },
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
