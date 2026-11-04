import * as collectionService from '../services/collection.service.js';
import {
  collectionItemIdSchema,
  createCollectionItemSchema,
  updateCollectionItemSchema,
} from '../schemas/collection.schema.js';

export async function list(req, res) {
  const items = await collectionService.list(req.user.id);

  return res.status(200).json({ success: true, data: { items } });
}

export async function add(req, res) {
  const data = createCollectionItemSchema.parse(req.body);
  const item = await collectionService.add(req.user.id, data);

  return res.status(201).json({ success: true, data: { item } });
}

export async function update(req, res) {
  const { id } = collectionItemIdSchema.parse(req.params);
  const data = updateCollectionItemSchema.parse(req.body);
  const item = await collectionService.update(req.user.id, id, data);

  return res.status(200).json({ success: true, data: { item } });
}

export async function remove(req, res) {
  const { id } = collectionItemIdSchema.parse(req.params);
  await collectionService.remove(req.user.id, id);

  return res.status(204).send();
}
