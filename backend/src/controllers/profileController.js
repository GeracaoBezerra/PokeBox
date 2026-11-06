import * as profileService from '../services/profile.service.js';
import { usernameParamSchema } from '../schemas/user.schema.js';

export async function publicCollection(req, res) {
  const { username } = usernameParamSchema.parse(req.params);
  const data = await profileService.getPublicCollection(username);

  return res.status(200).json({ success: true, data });
}
