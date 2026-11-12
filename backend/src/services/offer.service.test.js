import { jest } from "@jest/globals";

const OWNER_ID = "owner-id";
const PROPOSER_ID = "proposer-id";
const OFFER_ID = "offer-id";

const tx = { name: "tx" };

const offerRepository = {
  findById: jest.fn(),
  lockById: jest.fn(),
  deleteItems: jest.fn(),
  updateStatus: jest.fn(),
};
const listingRepository = { findById: jest.fn() };
const tradeRepository = { findByOfferId: jest.fn() };

jest.unstable_mockModule(
  "../repositories/offerRepository.js",
  () => offerRepository,
);
jest.unstable_mockModule(
  "../repositories/legacyListingRepository.js",
  () => listingRepository,
);
jest.unstable_mockModule(
  "../repositories/tradeRepository.js",
  () => tradeRepository,
);
jest.unstable_mockModule("../repositories/transaction.js", () => ({
  withTransaction: (fn) => fn(tx),
  lockInOrder: jest.fn(),
}));

const { changeStatus } = await import("./offer.service.js");

const accepted = {
  id: OFFER_ID,
  status: "ACCEPTED",
  listingId: "listing-id",
  proposerId: PROPOSER_ID,
};

beforeEach(() => {
  jest.clearAllMocks();
  offerRepository.findById.mockResolvedValue({
    ...accepted,
    items: [],
    listing: { collectionItemId: "item-owner" },
  });
  offerRepository.lockById.mockResolvedValue(accepted);
  listingRepository.findById.mockResolvedValue({
    id: "listing-id",
    collectionItem: { userId: OWNER_ID },
  });
});

describe("changeStatus em oferta aceita", () => {
  it.each([
    ["proponente cancela", PROPOSER_ID, "CANCELED"],
    ["dono recusa", OWNER_ID, "REJECTED"],
  ])(
    "%s quando ainda não virou troca: solta as cartas e muda o status",
    async (_, userId, nextStatus) => {
      tradeRepository.findByOfferId.mockResolvedValue(null);
      offerRepository.updateStatus.mockResolvedValue({
        id: OFFER_ID,
        status: nextStatus,
        quantity: 1,
        proposer: { username: "misty", name: "Misty" },
        listing: {
          id: "listing-id",
          collectionItem: {
            user: { username: "ash", name: "Ash" },
            card: { id: "base1-4", name: "Charizard", marketPrice: null },
          },
        },
        items: [],
      });

      const result = await changeStatus(userId, OFFER_ID, nextStatus);

      expect(tradeRepository.findByOfferId).toHaveBeenCalledWith(OFFER_ID, tx);
      expect(offerRepository.deleteItems).toHaveBeenCalledWith(OFFER_ID, tx);
      expect(offerRepository.updateStatus).toHaveBeenCalledWith(
        OFFER_ID,
        nextStatus,
        tx,
      );
      expect(result.status).toBe(nextStatus);
    },
  );

  it("oferta que já virou troca dá 409 e nada é escrito", async () => {
    tradeRepository.findByOfferId.mockResolvedValue({ id: "trade-id" });

    await expect(
      changeStatus(PROPOSER_ID, OFFER_ID, "CANCELED"),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(offerRepository.deleteItems).not.toHaveBeenCalled();
    expect(offerRepository.updateStatus).not.toHaveBeenCalled();
  });
});
