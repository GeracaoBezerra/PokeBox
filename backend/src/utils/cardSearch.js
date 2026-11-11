const MAX_SETS = 3;

export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

export function matchSets(tokens, sets) {
  const candidates = [];

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

export function setIdFromCardId(cardId, setIds) {
  return setIds
    .filter((setId) => cardId.startsWith(`${setId}-`))
    .reduce((longest, setId) => (longest && longest.length >= setId.length ? longest : setId), null);
}

export function scoreCard(card, { nameTokens = [], setIds = [], phrase = nameTokens.join(' ') }) {
  const name = normalizeText(card.name).split(/\s+/).join(' ');
  let score = 0;
  if (setIdFromCardId(card.id, setIds)) score += 3;
  if (phrase && name === phrase) score += 2;
  score += nameTokens.filter((token) => name.includes(token)).length;
  return score;
}

export function rankCards(cards, criteria) {
  const seen = new Set();
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

export function nameMatchesAny(cardName, tokens) {
  const name = normalizeText(cardName);
  return tokens.some((token) => name.includes(token));
}

export function toCardListItem(card, sets) {
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
