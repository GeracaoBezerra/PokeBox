import type { CardImage, CardListItem } from '../cards/types.js';

const MAX_SETS = 3;

export interface NamedSet {
  id: string;
  name: string;
}

export interface SearchableCard {
  id: string;
  name: string;
}

export interface ListableCard extends SearchableCard {
  localId: string;
  image: CardImage;
}

export interface SetMatch<S extends NamedSet> {
  sets: S[];
  used: string[];
  complete: string[];
}

export interface RankCriteria {
  nameTokens?: string[];
  setIds?: string[];
  phrase?: string;
}

interface SetCandidate<S extends NamedSet> {
  set: S;
  matched: string[];
  covered: number;
  ratio: number;
  index: number;
}

export function normalizeText(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function tokenize(text: unknown): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

export function matchSets<S extends NamedSet>(tokens: string[], sets: S[]): SetMatch<S> {
  const candidates: SetCandidate<S>[] = [];

  sets.forEach((set, index) => {
    const words = normalizeText(set.name).split(/\s+/).filter(Boolean);
    const setId = normalizeText(set.id);
    const byId = tokens.filter((token) => token === setId);
    const byName = tokens.filter((token) => words.includes(token));
    const matched = [...new Set([...byId, ...byName])];
    if (matched.length === 0) return;

    const covered = byId.length > 0 ? words.length : words.filter((word) => tokens.includes(word)).length;
    candidates.push({ set, matched, covered, ratio: covered / words.length, index });
  });

  const best = candidates
    .sort((a, b) => b.covered - a.covered || b.ratio - a.ratio || a.index - b.index)
    .slice(0, MAX_SETS);

  return {
    sets: best.map((candidate) => candidate.set),
    used: [...new Set(best.flatMap((candidate) => candidate.matched))],
    complete: [...new Set(best.filter((candidate) => candidate.ratio === 1).flatMap((candidate) => candidate.matched))],
  };
}

export function setIdFromCardId(cardId: string, setIds: string[]): string | null {
  return setIds
    .filter((setId) => cardId.startsWith(`${setId}-`))
    .reduce<string | null>((longest, setId) => (longest && longest.length >= setId.length ? longest : setId), null);
}

export function scoreCard(
  card: SearchableCard,
  { nameTokens = [], setIds = [], phrase = nameTokens.join(' ') }: RankCriteria,
): number {
  const name = normalizeText(card.name).split(/\s+/).join(' ');
  let score = 0;
  if (setIdFromCardId(card.id, setIds)) score += 3;
  if (phrase && name === phrase) score += 2;
  score += nameTokens.filter((token) => name.includes(token)).length;
  return score;
}

export function rankCards<C extends SearchableCard>(cards: C[], criteria: RankCriteria): C[] {
  const seen = new Set<string>();
  return cards
    .filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    })
    .map((card, index) => ({ card, index, score: scoreCard(card, criteria) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ card }) => card);
}

export function nameMatchesAny(cardName: string, tokens: string[]): boolean {
  const name = normalizeText(cardName);
  return tokens.some((token) => name.includes(token));
}

export function toCardListItem(card: ListableCard, sets: NamedSet[]): CardListItem {
  const setId = setIdFromCardId(card.id, sets.map((set) => set.id));
  const set = setId ? sets.find((item) => item.id === setId) : null;
  return {
    id: card.id,
    localId: card.localId,
    number: card.localId,
    name: card.name,
    set: set ? { id: set.id, name: set.name } : null,
    image: card.image,
  };
}
