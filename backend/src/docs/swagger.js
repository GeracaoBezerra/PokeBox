import { LANGS } from '../middlewares/validateCardParams.js';

const nullableString = { type: 'string', nullable: true };
const typeValue = {
  type: 'object',
  properties: { type: { type: 'string' }, value: nullableString },
};

const langParam = {
  name: 'lang',
  in: 'query',
  required: false,
  description: 'Idioma da carta (pt-br é aceito e convertido para pt)',
  schema: { type: 'string', enum: LANGS, default: 'en' },
};

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PokeBox API',
    version: '1.0.0',
    description: 'API do PokeBox',
  },
  servers: [{ url: `http://localhost:${process.env.BACKEND_PORT ?? process.env.PORT ?? 3000}` }],
  tags: [{ name: 'Cards', description: 'Cartas (TCGdex + cache)' }],
  paths: {
    '/cards': {
      get: {
        tags: ['Cards'],
        summary: 'Lista/busca cartas',
        description: 'Lista paginada de cartas da TCGdex, com busca opcional por nome. Cache em memória de 10 min.',
        parameters: [
          {
            name: 'name',
            in: 'query',
            required: false,
            description: 'Busca por nome (aceita parte do nome)',
            schema: { type: 'string', maxLength: 50, example: 'charizard' },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          langParam,
        ],
        responses: {
          200: {
            description: 'Lista de cartas',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CardListResponse' } } },
          },
          400: {
            description: 'Parâmetros inválidos',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
          },
          500: {
            description: 'Erro interno',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/cards/{id}': {
      get: {
        tags: ['Cards'],
        summary: 'Detalhes de uma carta',
        description: 'Busca na memória (1h), depois no banco (24h) e por último na API TCGdex.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da carta na TCGdex',
            schema: { type: 'string', pattern: '^[a-zA-Z0-9.\\-]+$', example: 'base1-4' },
          },
          langParam,
        ],
        responses: {
          200: {
            description: 'Carta encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CardDetailsResponse' } } },
          },
          400: {
            description: 'Parâmetros inválidos',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
          },
          404: {
            description: 'Carta não encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          500: {
            description: 'Erro interno',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CardSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'base1-4' },
          localId: { type: 'string', example: '4' },
          name: { type: 'string', example: 'Charizard' },
          image: {
            type: 'object',
            properties: { small: nullableString, large: nullableString },
          },
        },
      },
      CardListResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/CardSummary' } },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              hasNextPage: { type: 'boolean' },
            },
          },
        },
      },
      CardDetails: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'base1-4' },
          name: { type: 'string', example: 'Charizard' },
          number: { type: 'string', example: '4/102' },
          rarity: nullableString,
          illustrator: nullableString,
          category: { type: 'string', example: 'Pokemon' },
          image: {
            type: 'object',
            properties: { small: nullableString, large: nullableString },
          },
          set: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              logo: nullableString,
              symbol: nullableString,
            },
          },
          hp: { type: 'integer', nullable: true, example: 120 },
          types: { type: 'array', items: { type: 'string' }, example: ['Fire'] },
          stage: nullableString,
          evolveFrom: nullableString,
          description: nullableString,
          abilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, type: { type: 'string' }, effect: { type: 'string' } },
            },
          },
          attacks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                cost: { type: 'array', items: { type: 'string' } },
                damage: nullableString,
                effect: nullableString,
              },
            },
          },
          weaknesses: { type: 'array', items: typeValue },
          resistances: { type: 'array', items: typeValue },
          retreat: { type: 'integer', nullable: true },
          variants: {
            type: 'object',
            properties: {
              normal: { type: 'boolean' },
              reverse: { type: 'boolean' },
              holo: { type: 'boolean' },
              firstEdition: { type: 'boolean' },
            },
          },
          marketPrice: {
            type: 'object',
            nullable: true,
            properties: {
              source: { type: 'string', enum: ['tcgplayer', 'cardmarket'] },
              value: { type: 'number', example: 390 },
              currency: { type: 'string', example: 'USD' },
            },
          },
        },
      },
      CardUserInfo: {
        type: 'object',
        nullable: true,
        description: 'null quando o usuário não está logado',
        properties: {
          inCollection: { type: 'integer' },
          inWishlist: { type: 'boolean' },
          onTradeList: { type: 'boolean' },
        },
      },
      Listing: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user: {
            type: 'object',
            properties: { username: { type: 'string' }, avatarUrl: nullableString },
          },
          condition: { type: 'string' },
          price: { type: 'number', nullable: true },
          type: { type: 'string', enum: ['TRADE', 'SALE', 'TRADE_SALE'] },
        },
      },
      CardDetailsResponse: {
        type: 'object',
        properties: {
          card: { $ref: '#/components/schemas/CardDetails' },
          user: { $ref: '#/components/schemas/CardUserInfo' },
          listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
        },
      },
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Parâmetros inválidos' },
          errors: { type: 'array', items: { type: 'string' }, example: ['ID de carta inválido'] },
        },
      },
    },
  },
};
