import type { RequestHandler } from 'express';

import { listPublicCollectionQuerySchema } from '../schemas/collection.schema.js';
import { searchCollectorsQuerySchema, usernameParamSchema } from '../schemas/user.schema.js';
import type { ProfileService } from '../services/ProfileService.js';

export type ProfileActions = Pick<ProfileService, 'getPublicCollection' | 'getPublicCollectionPage' | 'searchCollectors'>;

export class ProfileController {
  constructor(private readonly profiles: ProfileActions) {}

  searchCollectors: RequestHandler = async (req, res) => {
    const { q, ...page } = searchCollectorsQuerySchema.parse(req.query);
    const { items, hasNextPage } = await this.profiles.searchCollectors(q, page);
    res.json({ success: true, data: { items }, pagination: { ...page, hasNextPage } });
  };

  publicCollection: RequestHandler = async (req, res) => {
    const { username } = usernameParamSchema.parse(req.params);
    const { filters, page } = listPublicCollectionQuerySchema.parse(req.query);

    if (!page) {
      const data = await this.profiles.getPublicCollection(username);
      res.status(200).json({ success: true, data });
      return;
    }

    const { user, items, hasNextPage } = await this.profiles.getPublicCollectionPage(username, filters, page);
    res.status(200).json({ success: true, data: { user, items }, pagination: { ...page, hasNextPage } });
  };
}
