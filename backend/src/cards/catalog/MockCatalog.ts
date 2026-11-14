import { cardMock } from '../../mocks/cardMock.js';
import type { CardFinder } from '../search/CardFinder.js';
import type { CardDetail, CardListResult, CardSummary, SetSummary } from '../types.js';
import type { CardCatalog } from './CardCatalog.js';

export class MockCatalog implements CardCatalog, CardFinder {
  async getById(): Promise<CardDetail> {
    return cardMock;
  }

  async search(): Promise<CardSummary[]> {
    const { id, number, name, image } = cardMock;
    return [{ id, localId: number.split('/')[0], name, image }];
  }

  async listSets(): Promise<SetSummary[]> {
    return [];
  }

  async listSetCards(): Promise<CardSummary[]> {
    return [];
  }

  async find(): Promise<CardListResult> {
    const { id, number, name, image, set } = cardMock;
    const localId = number.split('/')[0];
    return {
      cards: [{ id, localId, number: localId, name, set: { id: set.id, name: set.name }, image }],
      hasNextPage: false,
      search: null,
    };
  }
}
