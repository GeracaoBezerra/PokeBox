import { z } from 'zod';

const typeValue = z.object({ type: z.string(), value: z.string().optional() });

export const tcgdexCardSchema = z.object({
  id: z.string(),
  localId: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  image: z.string().optional(),
  category: z.string(),
  illustrator: z.string().optional(),
  rarity: z.string().optional(),
  set: z.object({
    id: z.string(),
    name: z.string(),
    logo: z.string().optional(),
    symbol: z.string().optional(),
    cardCount: z.object({ official: z.number(), total: z.number() }),
  }),
  variants: z
    .object({ normal: z.boolean(), reverse: z.boolean(), holo: z.boolean(), firstEdition: z.boolean() })
    .partial()
    .default({}),
  hp: z.number().optional(),
  types: z.array(z.string()).optional(),
  stage: z.string().optional(),
  evolveFrom: z.string().optional(),
  description: z.string().optional(),
  effect: z.string().optional(),
  attacks: z
    .array(z.object({
      name: z.string(),
      cost: z.array(z.string()).optional(),
      effect: z.string().optional(),
      damage: z.union([z.string(), z.number()]).optional(),
    }))
    .optional(),
  abilities: z.array(z.object({ name: z.string(), type: z.string(), effect: z.string() })).optional(),
  weaknesses: z.array(typeValue).optional(),
  resistances: z.array(typeValue).optional(),
  retreat: z.number().optional(),
  dexId: z.array(z.number()).optional(),
  regulationMark: z.string().optional(),
  legal: z.object({ standard: z.boolean(), expanded: z.boolean() }).partial().optional(),
  trainerType: z.string().optional(),
  energyType: z.string().optional(),
  pricing: z.unknown().optional(),
});

export const tcgdexSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  serie: z.object({ id: z.string(), name: z.string() }).optional(),
  releaseDate: z.string().optional(),
});

export const tcgdexCardBriefListSchema = z.array(
  z.object({
    id: z.string(),
    localId: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    image: z.string().optional(),
  })
);

export const tcgdexSetListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    logo: z.string().optional(),
    symbol: z.string().optional(),
    cardCount: z.object({ total: z.number(), official: z.number() }).partial().optional(),
  })
);

export const tcgdexSetWithCardsSchema = tcgdexSetSchema.extend({
  cards: tcgdexCardBriefListSchema,
});

const priceVariant = z.object({ marketPrice: z.number().nullish().catch(undefined) }).nullish().catch(undefined);

export const tcgdexPricingSchema = z.object({
  tcgplayer: z
    .object({
      unit: z.string().nullish().catch(undefined),
      updated: z.string().nullish().catch(undefined),
      holofoil: priceVariant,
      'unlimited-holofoil': priceVariant,
      normal: priceVariant,
      reverse: priceVariant,
      'reverse-holofoil': priceVariant,
    })
    .nullish()
    .catch(undefined),
  cardmarket: z
    .object({
      trend: z.number().nullish().catch(undefined),
      unit: z.string().nullish().catch(undefined),
      updated: z.string().nullish().catch(undefined),
    })
    .nullish()
    .catch(undefined),
});

export type TcgdexCard = z.infer<typeof tcgdexCardSchema>;
export type TcgdexCardBrief = z.infer<typeof tcgdexCardBriefListSchema>[number];
export type TcgdexSetListItem = z.infer<typeof tcgdexSetListSchema>[number];
export type TcgdexPricing = z.infer<typeof tcgdexPricingSchema>;
