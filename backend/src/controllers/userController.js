import * as userRepository from '../repositories/userRepository.js';
import { updateUserSchema } from '../schemas/user.schema.js';

export async function updateMe(req, res) {
  const data = updateUserSchema.parse(req.body);
  const user = await userRepository.update(req.user.id, data);

  return res.status(200).json({ success: true, data: { user } });
}

export async function deleteMe(req, res) {
  await userRepository.deactivate(req.user.id);

  return res.status(204).send();
}