import type { RequestHandler } from 'express';

import {
  createListingSchema,
  listingIdSchema,
  listListingsQuerySchema,
  listMyListingsQuerySchema,
  updateListingSchema,
} from '../schemas/listing.schema.js';
import type { ListingService } from '../services/ListingService.js';
import { currentUser } from '../utils/currentUser.js';

export type ListingActions = Pick<ListingService, 'list' | 'listMine' | 'listMinePage' | 'getById' | 'create' | 'update'>;

export class ListingController {
  constructor(private readonly listings: ListingActions) {}

  list: RequestHandler = async (req, res) => {
    const query = listListingsQuerySchema.parse(req.query);
    const userId = query.wishlist || query.includeWishlist ? currentUser(req).id : undefined;
    const { items, hasNextPage, wishlistCardIds } = await this.listings.list(query, userId);
    if (userId) res.set('Cache-Control', 'private, no-store');

    res.status(200).json({
      success: true,
      data: { items, wishlistCardIds },
      pagination: { page: query.page, limit: query.limit, hasNextPage },
    });
  };

  listMine: RequestHandler = async (req, res) => {
    const userId = currentUser(req).id;
    const { page } = listMyListingsQuerySchema.parse(req.query);

    if (!page) {
      const items = await this.listings.listMine(userId);
      res.status(200).json({ success: true, data: { items } });
      return;
    }

    const { items, hasNextPage } = await this.listings.listMinePage(userId, page);
    res.status(200).json({ success: true, data: { items }, pagination: { ...page, hasNextPage } });
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = listingIdSchema.parse(req.params);
    const listing = await this.listings.getById(req.user, id);

    res.status(200).json({ success: true, data: { listing } });
  };

  create: RequestHandler = async (req, res) => {
    const data = createListingSchema.parse(req.body);
    const listing = await this.listings.create(currentUser(req).id, data);

    res.status(201).json({ success: true, data: { listing } });
  };

  update: RequestHandler = async (req, res) => {
    const { id } = listingIdSchema.parse(req.params);
    const data = updateListingSchema.parse(req.body);
    const listing = await this.listings.update(currentUser(req), id, data);

    res.status(200).json({ success: true, data: { listing } });
  };
}
