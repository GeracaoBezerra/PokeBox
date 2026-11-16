import type { RequestHandler } from 'express';

import { listingIdSchema } from '../schemas/listing.schema.js';
import {
  createOfferSchema,
  listOffersQuerySchema,
  offerIdSchema,
  updateOfferStatusSchema,
} from '../schemas/offer.schema.js';
import type { OfferService } from '../services/OfferService.js';
import { currentUser } from '../utils/currentUser.js';

export type OfferActions = Pick<OfferService, 'create' | 'listMine' | 'listMinePage' | 'getById' | 'changeStatus'>;

export class OfferController {
  constructor(private readonly offers: OfferActions) {}

  create: RequestHandler = async (req, res) => {
    const { id } = listingIdSchema.parse(req.params);
    const data = createOfferSchema.parse(req.body);
    const offer = await this.offers.create(currentUser(req), id, data);

    res.status(201).json({ success: true, data: { offer } });
  };

  listMine: RequestHandler = async (req, res) => {
    const userId = currentUser(req).id;
    const {
      filters: { status, side },
      page,
    } = listOffersQuerySchema.parse(req.query);

    if (!side || !page) {
      const { sent, received } = await this.offers.listMine(userId, status);
      res.status(200).json({ success: true, data: { sent, received } });
      return;
    }

    const { items, hasNextPage } = await this.offers.listMinePage(userId, side, status, page);
    res.status(200).json({ success: true, data: { items }, pagination: { ...page, hasNextPage } });
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = offerIdSchema.parse(req.params);
    const offer = await this.offers.getById(currentUser(req).id, id);

    res.status(200).json({ success: true, data: { offer } });
  };

  changeStatus: RequestHandler = async (req, res) => {
    const { id } = offerIdSchema.parse(req.params);
    const { status } = updateOfferStatusSchema.parse(req.body);
    const offer = await this.offers.changeStatus(currentUser(req).id, id, status);

    res.status(200).json({ success: true, data: { offer } });
  };
}
