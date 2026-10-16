// backend/src/controllers/userController.js
import { z } from "zod";
import * as userRepository from "../repositories/userRepository.js";

function validationError(res, error) {
  return res.status(400).json({
    error: "Dados inválidos",
    details: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

const optionalText = (max) => z.string().trim().max(max).nullable();

// Só campos de perfil. Email, senha, role e accountStatus ficam de fora.
const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\d{10,11}$/, "Telefone com DDD, só números")
      .nullable(),
    cep: z
      .string()
      .trim()
      .regex(/^\d{8}$/, "CEP com 8 dígitos, só números")
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
      .regex(/^[A-Z]{2}$/, "Use a sigla, ex: CE")
      .nullable(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Envie ao menos um campo");

export async function updateMe(req, res, next) {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const user = await userRepository.update(req.user.id, parsed.data);
    return res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function deleteMe(req, res, next) {
  try {
    await userRepository.deactivate(req.user.id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}