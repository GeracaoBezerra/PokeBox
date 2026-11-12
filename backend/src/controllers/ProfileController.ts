import type { RequestHandler } from 'express';

import { usernameParamSchema } from '../schemas/user.schema.js';
import type { ProfileService } from '../services/ProfileService.js';

export type ProfileActions = Pick<ProfileService, 'getPublicCollection'>;

export class ProfileController {
  constructor(private readonly profiles: ProfileActions) {}

  publicCollection: RequestHandler = async (req, res) => {
    const { username } = usernameParamSchema.parse(req.params);
    const data = await this.profiles.getPublicCollection(username);

    res.status(200).json({ success: true, data });
  };
}
