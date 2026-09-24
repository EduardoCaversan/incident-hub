import { z } from 'zod';

const emailSchema = z
  .string({ error: 'Email é obrigatório.' })
  .trim()
  .email('Email inválido.')
  .max(254, 'Email deve possuir no máximo 254 caracteres.')
  .transform((email) => email.toLowerCase());

export const registerSchema = z
  .object({
    name: z
      .string({ error: 'Nome é obrigatório.' })
      .trim()
      .min(2, 'Nome deve possuir ao menos 2 caracteres.')
      .max(100, 'Nome deve possuir no máximo 100 caracteres.'),
    email: emailSchema,
    password: z
      .string({ error: 'Senha é obrigatória.' })
      .min(8, 'Senha deve possuir ao menos 8 caracteres.')
      .max(72, 'Senha deve possuir no máximo 72 caracteres.')
      .regex(/[a-z]/, 'Senha deve possuir uma letra minúscula.')
      .regex(/[A-Z]/, 'Senha deve possuir uma letra maiúscula.')
      .regex(/\d/, 'Senha deve possuir um número.'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ error: 'Senha é obrigatória.' })
      .min(1, 'Senha é obrigatória.')
      .max(72, 'Senha deve possuir no máximo 72 caracteres.'),
  })
  .strict();
