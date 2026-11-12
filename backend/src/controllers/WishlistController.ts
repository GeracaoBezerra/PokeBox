import type { RequestHandler } from 'express';

import { addWishlistItemSchema, wishlistItemIdSchema } from '../schemas/wishlist.schema.js';
import type { WishlistService } from '../services/WishlistService.js';
import { currentUser } from '../utils/currentUser.js';

export type WishlistActions = Pick<WishlistService, 'list' | 'add' | 'remove'>;

export class WishlistController {
  constructor(private readonly wishlist: WishlistActions) {}

  list: RequestHandler = async (req, res) => {
    const items = await this.wishlist.list(currentUser(req).id);

    res.status(200).json({ success: true, data: { items } });
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
