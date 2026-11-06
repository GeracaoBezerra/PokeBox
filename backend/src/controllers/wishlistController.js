import * as wishlistService from '../services/wishlist.service.js';
import { addWishlistItemSchema, wishlistItemIdSchema } from '../schemas/wishlist.schema.js';

export async function list(req, res) {
  const items = await wishlistService.list(req.user.id);

  return res.status(200).json({ success: true, data: { items } });
}

export async function add(req, res) {
  const data = addWishlistItemSchema.parse(req.body);
  const item = await wishlistService.add(req.user.id, data);

  return res.status(201).json({ success: true, data: { item } });
}

export async function remove(req, res) {
  const { id } = wishlistItemIdSchema.parse(req.params);
  await wishlistService.remove(req.user.id, id);

  return res.status(204).send();
}
