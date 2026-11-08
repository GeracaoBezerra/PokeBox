import * as offerService from '../services/offer.service.js';
import { listingIdSchema } from '../schemas/listing.schema.js';
import {
  createOfferSchema,
  listOffersQuerySchema,
  offerIdSchema,
  updateOfferStatusSchema,
} from '../schemas/offer.schema.js';

export async function create(req, res) {
  const { id } = listingIdSchema.parse(req.params);
  const data = createOfferSchema.parse(req.body);
  const offer = await offerService.create(req.user, id, data);

  return res.status(201).json({ success: true, data: { offer } });
}

export async function listMine(req, res) {
  const { status } = listOffersQuerySchema.parse(req.query);
  const { sent, received } = await offerService.listMine(req.user.id, status);

  return res.status(200).json({ success: true, data: { sent, received } });
}

export async function getById(req, res) {
  const { id } = offerIdSchema.parse(req.params);
  const offer = await offerService.getById(req.user.id, id);

  return res.status(200).json({ success: true, data: { offer } });
}

export async function changeStatus(req, res) {
  const { id } = offerIdSchema.parse(req.params);
  const { status } = updateOfferStatusSchema.parse(req.body);
  const offer = await offerService.changeStatus(req.user.id, id, status);

  return res.status(200).json({ success: true, data: { offer } });
}
