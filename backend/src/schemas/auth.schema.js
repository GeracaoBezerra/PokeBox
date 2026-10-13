import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/, 'username: 3 a 20 caracteres, apenas a-z, 0-9 e _'),
  name: z.string().trim().min(2, 'name: mínimo 2 caracteres').max(120),
  email: z.email('email inválido').toLowerCase(),
  password: z
    .string()
    .min(8, 'password: mínimo 8 caracteres')
    .max(72, 'password: máximo 72 caracteres'),
});

export const loginSchema = z.object({
  email: z.email('email inválido').toLowerCase(),
  password: z.string().min(1, 'password é obrigatório'),
});
