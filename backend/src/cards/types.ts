export type CardImage = {
  small: string | null;
  large: string | null;
};

export type MarketPrice = {
  source: string;
  value: number;
  currency: string;
  updatedAt?: string | null;
};

export type CardAttack = {
  name: string;
  cost: string[];
  damage: string | null;
  effect: string | null;
};

export type CardAbility = {
  name: string;
  type: string;
  effect: string;
};

export type TypeValue = {
  type: string;
  value: string | null;
};

export type CardDetailSet = {
  id: string;
  name: string;
  logo: string | null;
  symbol: string | null;
  series: string | null;
  releaseDate: string | null;
};

export type CardDetail = {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  illustrator: string | null;
  category: string;
  image: CardImage;
  set: CardDetailSet;
  hp: number | null;
  types: string[];
  stage: string | null;
  evolveFrom: string | null;
  description: string | null;
  abilities: CardAbility[];
  attacks: CardAttack[];
  weaknesses: TypeValue[];
  resistances: TypeValue[];
  retreat: number | null;
  dexId: number[];
  regulationMark: string | null;
  legal: { standard: boolean; expanded: boolean };
  trainerType: string | null;
  energyType: string | null;
  variants: { normal: boolean; reverse: boolean; holo: boolean; firstEdition: boolean };
  marketPrice: MarketPrice | null;
};

export type CardSummary = {
  id: string;
  localId: string;
  name: string;
  image: CardImage;
};

export type SetSummary = {
  id: string;
  name: string;
  logo: string | null;
  symbol: string | null;
  cardCount: { total?: number; official?: number } | null;
};

export type SetInfo = {
  series: string | null;
  releaseDate: string | null;
};

export type CardListItem = {
  id: string;
  localId: string;
  number: string;
  name: string;
  set: { id: string; name: string } | null;
  image: CardImage;
};

export type CardSearchInfo = {
  name: string | null;
  sets: string[];
  ignored: string[];
};

export type CardListQuery = {
  lang: string;
  name?: string;
  page: number;
  limit: number;
};

export type CardListResult = {
  cards: CardListItem[];
  hasNextPage: boolean;
  search: CardSearchInfo | null;
};
