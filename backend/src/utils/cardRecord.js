export function toCardRecord(card) {
  return {
    id: card.id,
    name: card.name,
    setId: card.set.id,
    setName: card.set.name,
    setSeries: card.set.series ?? null,
    releaseDate: card.set.releaseDate ? new Date(card.set.releaseDate) : null,
    number: card.number,
    rarity: card.rarity ?? null,
    imageUrl: card.image?.small ?? null,
    category: card.category ?? null,
    types: card.types ?? [],
    hp: card.hp ?? null,
    stage: card.stage ?? null,
    illustrator: card.illustrator ?? null,
    dexId: card.dexId ?? [],
    regulationMark: card.regulationMark ?? null,
    trainerType: card.trainerType ?? null,
    energyType: card.energyType ?? null,
  };
}
