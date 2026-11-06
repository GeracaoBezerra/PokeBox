import * as listingService from '../services/listing.service.js';
import {
  createListingSchema,
  listingIdSchema,
  listListingsQuerySchema,
  updateListingSchema,
} from '../schemas/listing.schema.js';

export async function list(req, res) {
  const query = listListingsQuerySchema.parse(req.query);
  const { items, hasNextPage } = await listingService.list(query);

  return res.status(200).json({
    success: true,
    data: { items },
    pagination: { page: query.page, limit: query.limit, hasNextPage },
  });
}

export async function listMine(req, res) {
  const items = await listingService.listMine(req.user.id);

  return res.status(200).json({ success: true, data: { items } });
}

export async function getById(req, res) {
  const { id } = listingIdSchema.parse(req.params);
  const listing = await listingService.getById(req.user, id);

  return res.status(200).json({ success: true, data: { listing } });
}

export async function create(req, res) {
  const data = createListingSchema.parse(req.body);
  const listing = await listingService.create(req.user.id, data);

  return res.status(201).json({ success: true, data: { listing } });
}

export async function update(req, res) {
  const { id } = listingIdSchema.parse(req.params);
  const data = updateListingSchema.parse(req.body);
  const listing = await listingService.update(req.user, id, data);

  return res.status(200).json({ success: true, data: { listing } });
}
