import { z } from 'zod';

export const usernameRule = z
  .string()
  .regex(/^[a-z0-9_]{3,20}$/, 'username: 3 a 20 caracteres, apenas a-z, 0-9 e _');

const optionalText = (max) => z.string().trim().max(max).nullable();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\d{10,11}$/, 'Telefone com DDD, só números')
      .nullable(),
    cep: z
      .string()
      .trim()
      .regex(/^\d{8}$/, 'CEP com 8 dígitos, só números')
      .nullable(),
    street: optionalText(150),
    number: optionalText(10),
    complement: optionalText(100),
    neighborhood: optionalText(100),
    city: optionalText(100),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Use a sigla, ex: CE')
      .nullable(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Envie ao menos um campo');

export const usernameParamSchema = z.object({ username: usernameRule });
