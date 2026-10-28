// backend/src/controllers/authController.js
import * as authService from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';

export async function register(req, res) {
  const input = registerSchema.parse(req.body);
  const { user, token } = await authService.register(input);

  return res.status(201).json({ success: true, data: { user, token } });
}

export async function login(req, res) {
  const input = loginSchema.parse(req.body);
  const { user, token } = await authService.login(input);

  return res.status(200).json({ success: true, data: { user, token } });
}

export async function me(req, res) {
  return res.status(200).json({ success: true, data: { user: req.user } });
}
