import type { Card } from '../generated/prisma/index.js';
import { CARD_TYPES } from './listingSearch.js';

export const cardFilterFields = { types: true, setId: true, setName: true, rarity: true } as const;

export function cardFilterOptions(cards: Pick<Card, keyof typeof cardFilterFields>[]) {
  const types = new Set(cards.flatMap((card) => card.types));
  const sets = new Map(cards.map((card) => [card.setId, { id: card.setId, name: card.setName }]));
  const rarities = new Map<string, string>();
  for (const { rarity } of cards) {
    const value = rarity?.trim();
    if (value && value.length <= 50) rarities.set(value.toLowerCase(), value);
  }
  return {
    types: CARD_TYPES.filter((type) => types.has(type)),
    sets: [...sets.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    rarities: [...rarities.values()].sort(),
  };
}
