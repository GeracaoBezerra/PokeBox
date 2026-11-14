import type { RequestHandler } from 'express';

import { updateUserSchema } from '../schemas/user.schema.js';
import type { UserService } from '../services/UserService.js';
import { currentUser } from '../utils/currentUser.js';

export type UserActions = Pick<UserService, 'updateMe' | 'deactivateMe'>;

export class UserController {
  constructor(private readonly users: UserActions) {}

  updateMe: RequestHandler = async (req, res) => {
    const changes = updateUserSchema.parse(req.body);
    const user = await this.users.updateMe(currentUser(req).id, changes);

    res.status(200).json({ success: true, data: { user } });
  };

  deleteMe: RequestHandler = async (req, res) => {
    await this.users.deactivateMe(currentUser(req).id);

    res.status(204).send();
  };
}
