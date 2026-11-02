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
        properties: {
          id: { type: "string" },
          user: {
            type: "object",
            properties: {
              username: { type: "string" },
              avatarUrl: nullableString,
            },
          },
          condition: { type: "string" },
          price: { type: "number", nullable: true },
          type: { type: "string", enum: ["TRADE", "SALE", "TRADE_SALE"] },
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
