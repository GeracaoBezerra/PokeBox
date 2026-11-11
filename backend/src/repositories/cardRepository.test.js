import { jest } from "@jest/globals";

const prisma = {
  cardCache: { findUnique: jest.fn(), upsert: jest.fn() },
  card: { updateMany: jest.fn() },
};
const tcgdexRepository = {
  fetchCardFromTcgdex: jest.fn(),
  searchCardsInTcgdex: jest.fn(),
  listSets: jest.fn(),
  listSetCards: jest.fn(),
};

jest.unstable_mockModule("../lib/prisma.js", () => ({ prisma }));
jest.unstable_mockModule("./tcgdexRepository.js", () => tcgdexRepository);

const { findCardById, findCards } = await import("./cardRepository.js");
const { TcgdexUnavailableError } = await import("../utils/tcgdexError.js");

const brief = (id, name) => ({
  id,
  localId: id.split("-").pop(),
  name,
  image: { small: `https://img/${id}/low.webp`, large: `https://img/${id}/high.webp` },
});

const sets = [
  { id: "base1", name: "Base Set" },
  { id: "base4", name: "Base Set 2" },
  { id: "sv03.5", name: "151" },
  { id: "sv03", name: "Obsidian Flames" },
];

const setCards = {
  base1: [brief("base1-1", "Alakazam"), brief("base1-4", "Charizard"), brief("base1-58", "Pikachu")],
  base4: [brief("base4-4", "Charizard"), brief("base4-87", "Pikachu")],
};

const allCards = [
  brief("sv03-125", "Charizard ex"),
  brief("sv03.5-6", "Charizard ex"),
  brief("base4-4", "Charizard"),
  brief("base1-4", "Charizard"),
  brief("base1-58", "Pikachu"),
];

let langSeq = 0;
const freshLang = () => `l${++langSeq}`;

const resolvedCard = (lang) => ({
  id: "base1-4",
  name: `Charizard ${lang}`,
  marketPrice: { value: 100, currency: "USD", updatedAt: "2026-11-01" },
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.cardCache.findUnique.mockResolvedValue(null);
  prisma.cardCache.upsert.mockResolvedValue({});
  prisma.card.updateMany.mockResolvedValue({ count: 1 });
  tcgdexRepository.fetchCardFromTcgdex.mockImplementation(async (_id, lang) =>
    resolvedCard(lang),
  );
  tcgdexRepository.listSets.mockResolvedValue(sets);
  tcgdexRepository.listSetCards.mockImplementation(async (setId) => setCards[setId] ?? []);
  tcgdexRepository.searchCardsInTcgdex.mockImplementation(async ({ name }) =>
    allCards.filter((card) => card.name.toLowerCase().includes(name ?? "")),
  );
});

describe("findCardById grava o cache com o id resolvido", () => {
  test.each([
    ["BASE1-4", "en"],
    ["base1-4", "fr"],
  ])("pedido %s (%s) grava CardCache e preço com base1-4", async (id, lang) => {
    const card = await findCardById(id, lang);

    expect(card.id).toBe("base1-4");
    expect(prisma.cardCache.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.cardCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cardId_lang: { cardId: "base1-4", lang } },
        create: expect.objectContaining({ cardId: "base1-4", lang }),
      }),
    );
    expect(prisma.card.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.card.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "base1-4" } }),
    );
  });

  test("depois de BASE1-4, o id pedido e o resolvido saem da memória", async () => {
    await findCardById("BASE1-4", "de");
    await findCardById("BASE1-4", "de");
    await findCardById("base1-4", "de");

    expect(tcgdexRepository.fetchCardFromTcgdex).toHaveBeenCalledTimes(1);
    expect(prisma.cardCache.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("findCards", () => {
  test("charizard traz os Charizard com set e number", async () => {
    const result = await findCards({ lang: freshLang(), name: "charizard", page: 1, limit: 20 });

    expect(result.cards.map((card) => card.id)).toEqual(["base4-4", "base1-4", "sv03-125", "sv03.5-6"]);
    expect(result.cards[3]).toEqual({
      id: "sv03.5-6",
      localId: "6",
      number: "6",
      name: "Charizard ex",
      set: { id: "sv03.5", name: "151" },
      image: { small: "https://img/sv03.5-6/low.webp", large: "https://img/sv03.5-6/high.webp" },
    });
    expect(result.search).toEqual({ name: "charizard", sets: [], ignored: [] });
    expect(result.hasNextPage).toBe(false);
    expect(tcgdexRepository.searchCardsInTcgdex).toHaveBeenCalledWith(
      expect.objectContaining({ name: "charizard", page: 1, limit: 250 }),
    );
  });

  test("charizard base traz o Charizard do Base Set primeiro", async () => {
    const result = await findCards({ lang: freshLang(), name: "charizard base", page: 1, limit: 20 });

    expect(result.cards[0].id).toBe("base1-4");
    expect(result.cards[0].set).toEqual({ id: "base1", name: "Base Set" });
    expect(result.cards.map((card) => card.id)).not.toContain("base1-58");
    expect(result.search).toEqual({ name: "charizard", sets: ["Base Set", "Base Set 2"], ignored: [] });
    expect(tcgdexRepository.listSetCards).toHaveBeenCalledTimes(2);
  });

  test("charizard base x pipi popo traz os Charizard e ignora o lixo", async () => {
    const result = await findCards({ lang: freshLang(), name: "charizard base x pipi popo", page: 1, limit: 20 });

    expect(result.cards[0].id).toBe("base1-4");
    expect(result.cards.every((card) => card.name.startsWith("Charizard"))).toBe(true);
    expect(result.cards).toHaveLength(4);
    expect(result.search).toEqual({ name: "charizard", sets: ["Base Set", "Base Set 2"], ignored: ["pipi", "popo"] });
    expect(tcgdexRepository.searchCardsInTcgdex).toHaveBeenCalledTimes(4);
  });

  test("base set traz as cartas do Base Set", async () => {
    const result = await findCards({ lang: freshLang(), name: "base set", page: 1, limit: 20 });

    expect(result.cards.slice(0, 3).map((card) => card.id)).toEqual(["base1-1", "base1-4", "base1-58"]);
    expect(result.search).toEqual({ name: null, sets: ["Base Set", "Base Set 2"], ignored: [] });
    expect(tcgdexRepository.searchCardsInTcgdex).not.toHaveBeenCalled();
  });

  test("xyzxyz devolve lista vazia", async () => {
    const result = await findCards({ lang: freshLang(), name: "xyzxyz", page: 1, limit: 20 });

    expect(result).toEqual({
      cards: [],
      hasNextPage: false,
      search: { name: null, sets: [], ignored: ["xyzxyz"] },
    });
  });

  test("TCGdex fora do ar repassa o erro", async () => {
    tcgdexRepository.searchCardsInTcgdex.mockRejectedValue(new TcgdexUnavailableError("fora"));

    await expect(findCards({ lang: freshLang(), name: "charizard", page: 1, limit: 20 })).rejects.toBeInstanceOf(
      TcgdexUnavailableError,
    );
  });

  test("página 2 da mesma busca sai do cache e pagina a lista ranqueada", async () => {
    const lang = freshLang();
    const first = await findCards({ lang, name: "Charizard", page: 1, limit: 3 });
    const second = await findCards({ lang, name: "charizard ", page: 2, limit: 3 });

    expect(first.cards).toHaveLength(3);
    expect(first.hasNextPage).toBe(true);
    expect(second.cards.map((card) => card.id)).toEqual(["sv03.5-6"]);
    expect(second.hasNextPage).toBe(false);
    expect(tcgdexRepository.searchCardsInTcgdex).toHaveBeenCalledTimes(1);
    expect(tcgdexRepository.listSets).toHaveBeenCalledTimes(1);
  });

  test("sem nome mantém a lista paginada da TCGdex", async () => {
    tcgdexRepository.searchCardsInTcgdex.mockResolvedValue([brief("base1-4", "Charizard"), brief("base1-58", "Pikachu")]);

    const result = await findCards({ lang: freshLang(), name: undefined, page: 3, limit: 2 });

    expect(tcgdexRepository.searchCardsInTcgdex).toHaveBeenCalledWith(expect.objectContaining({ page: 3, limit: 2 }));
    expect(result.hasNextPage).toBe(true);
    expect(result.search).toBeNull();
    expect(result.cards[0]).toMatchObject({ number: "4", set: { id: "base1", name: "Base Set" } });
  });
});

