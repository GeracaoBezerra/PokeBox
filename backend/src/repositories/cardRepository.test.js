import { jest } from "@jest/globals";

const prisma = {
  cardCache: { findUnique: jest.fn(), upsert: jest.fn() },
  card: { updateMany: jest.fn() },
};
const tcgdexRepository = {
  fetchCardFromTcgdex: jest.fn(),
  searchCardsInTcgdex: jest.fn(),
};

jest.unstable_mockModule("../lib/prisma.js", () => ({ prisma }));
jest.unstable_mockModule("./tcgdexRepository.js", () => tcgdexRepository);

const { findCardById } = await import("./cardRepository.js");

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
