import { z } from 'zod';

import { CardCondition, CardFinish } from '../generated/prisma/index.js';
import { tokenize } from '../utils/cardSearch.js';
import { ITEM_SORTS } from '../utils/itemSort.js';
import { CARD_TYPES } from '../utils/listingSearch.js';

const upperEnum = <T extends Record<string, string>>(values: T, message: string) =>
  z.preprocess((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value), z.enum(values, { message }));

export const booleanFilter = (name: string) =>
  z.enum(['true', 'false'], { message: `${name} deve ser true ou false` }).transform((value) => value === 'true');

export const qFilter = z
  .string()
  .trim()
  .min(1, 'q não pode ser vazio')
  .max(50, 'q deve ter no máximo 50 caracteres')
  .refine(
    (value) => tokenize(value).some((word) => /[\p{L}\p{N}]/u.test(word)),
    'q precisa ter ao menos uma palavra com 2 letras ou números',
  );

export const conditionFilter = upperEnum(
  CardCondition,
  `condition deve ser um de: ${Object.values(CardCondition).join(', ')}`,
);

export const finishFilter = upperEnum(CardFinish, `finish deve ser um de: ${Object.values(CardFinish).join(', ')}`);

export const setIdFilter = z
  .string()
  .regex(/^[a-zA-Z0-9.\-]+$/, 'ID de set inválido')
  .max(30, 'setId deve ter no máximo 30 caracteres');

export const typeFilter = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? (CARD_TYPES.find((type) => type.toLowerCase() === value.trim().toLowerCase()) ?? value)
      : value,
  z.enum(CARD_TYPES, { message: `type deve ser um de: ${CARD_TYPES.join(', ')}` }),
);

export const rarityFilter = z
  .string()
  .trim()
  .min(1, 'rarity não pode ser vazio')
  .max(50, 'rarity deve ter no máximo 50 caracteres');

export const itemSortFilter = z.enum(ITEM_SORTS, { message: `sort deve ser um de: ${ITEM_SORTS.join(', ')}` });
