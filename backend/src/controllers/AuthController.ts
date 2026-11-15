import type { RequestHandler } from 'express';

import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import type { AuthService } from '../services/AuthService.js';
import { currentUser } from '../utils/currentUser.js';

export type AuthActions = Pick<AuthService, 'register' | 'login'>;

export class AuthController {
  constructor(private readonly auth: AuthActions) {}

  register: RequestHandler = async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { user, token } = await this.auth.register(input);

    res.status(201).json({ success: true, data: { user, token } });
  };

  login: RequestHandler = async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { user, token } = await this.auth.login(input);

    res.status(200).json({ success: true, data: { user, token } });
  };

  me: RequestHandler = (req, res) => {
    res.status(200).json({ success: true, data: { user: currentUser(req) } });
  };
}
