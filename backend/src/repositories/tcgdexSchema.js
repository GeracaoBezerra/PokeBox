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
  pricing: z.any().optional(),
});

export const tcgdexCardBriefListSchema = z.array(
  z.object({
    id: z.string(),
    localId: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    image: z.string().optional(),
  })
);

