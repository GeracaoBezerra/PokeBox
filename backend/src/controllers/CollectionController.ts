import type { RequestHandler } from 'express';

import {
  collectionItemIdSchema,
  createCollectionItemSchema,
  listCollectionQuerySchema,
  updateCollectionItemSchema,
} from '../schemas/collection.schema.js';
import type { CollectionService } from '../services/CollectionService.js';
import { currentUser } from '../utils/currentUser.js';

export type CollectionActions = Pick<CollectionService, 'list' | 'listPage' | 'summary' | 'add' | 'update' | 'remove'>;

export class CollectionController {
  constructor(private readonly collection: CollectionActions) {}

  list: RequestHandler = async (req, res) => {
    const userId = currentUser(req).id;
    const { filters, page } = listCollectionQuerySchema.parse(req.query);

    if (!page) {
      const items = await this.collection.list(userId);
      res.status(200).json({ success: true, data: { items } });
      return;
    }

    const { items, hasNextPage } = await this.collection.listPage(userId, filters, page);
    res.status(200).json({ success: true, data: { items }, pagination: { ...page, hasNextPage } });
  };

  summary: RequestHandler = async (req, res) => {
    const summary = await this.collection.summary(currentUser(req).id);

    res.status(200).json({ success: true, data: summary });
  };

  add: RequestHandler = async (req, res) => {
    const data = createCollectionItemSchema.parse(req.body);
    const { item, removedFromWishlist } = await this.collection.add(currentUser(req).id, data);

    res.status(201).json({ success: true, data: { item, removedFromWishlist } });
  };

  update: RequestHandler = async (req, res) => {
    const { id } = collectionItemIdSchema.parse(req.params);
    const data = updateCollectionItemSchema.parse(req.body);
    const item = await this.collection.update(currentUser(req).id, id, data);

    res.status(200).json({ success: true, data: { item } });
  };

  remove: RequestHandler = async (req, res) => {
    const { id } = collectionItemIdSchema.parse(req.params);
    await this.collection.remove(currentUser(req).id, id);

    res.status(204).send();
  };
}
