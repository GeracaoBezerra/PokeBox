import type { RequestHandler } from 'express';

import { addWishlistItemSchema, listWishlistQuerySchema, wishlistItemIdSchema } from '../schemas/wishlist.schema.js';
import type { WishlistService } from '../services/WishlistService.js';
import { currentUser } from '../utils/currentUser.js';

export type WishlistActions = Pick<WishlistService, 'list' | 'listPage' | 'filterOptions' | 'add' | 'remove'>;

export class WishlistController {
  constructor(private readonly wishlist: WishlistActions) {}

  list: RequestHandler = async (req, res) => {
    const userId = currentUser(req).id;
    const { filters, page, includeFilters } = listWishlistQuerySchema.parse(req.query);

    if (!page) {
      const items = await this.wishlist.list(userId);
      res.status(200).json({ success: true, data: { items } });
      return;
    }

    const { items, hasNextPage, filters: allFilters } = await this.wishlist.listPage(userId, filters, page, includeFilters);
    res.status(200).json({ success: true, data: { items, filters: allFilters }, pagination: { ...page, hasNextPage } });
  };

  filters: RequestHandler = async (req, res) => {
    const filters = await this.wishlist.filterOptions(currentUser(req).id);
    res.set('Cache-Control', 'private, no-store').json({ success: true, data: filters });
  };

  add: RequestHandler = async (req, res) => {
    const data = addWishlistItemSchema.parse(req.body);
    const item = await this.wishlist.add(currentUser(req).id, data);

    res.status(201).json({ success: true, data: { item } });
  };

  remove: RequestHandler = async (req, res) => {
    const { id } = wishlistItemIdSchema.parse(req.params);
    await this.wishlist.remove(currentUser(req).id, id);

    res.status(204).send();
  };
}
