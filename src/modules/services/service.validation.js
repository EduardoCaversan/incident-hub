import { z } from 'zod';
import { objectIdSchema } from '../../shared/validation/schemas.js';
import { SERVICE_STATUS_VALUES } from './service.status.js';

const serviceFields = {
  name: z
    .string({ error: 'Nome é obrigatório.' })
    .trim()
    .min(2, 'Nome deve possuir ao menos 2 caracteres.')
    .max(100, 'Nome deve possuir no máximo 100 caracteres.'),
  description: z
    .string({ error: 'Descrição deve ser um texto.' })
    .trim()
    .max(500, 'Descrição deve possuir no máximo 500 caracteres.'),
  status: z.enum(SERVICE_STATUS_VALUES, { error: 'Status de serviço inválido.' }),
};

export const createServiceSchema = z
  .object({
    name: serviceFields.name,
    description: serviceFields.description.optional(),
    status: serviceFields.status.optional(),
  })
  .strict();

export const updateServiceSchema = z
  .object({
    name: serviceFields.name.optional(),
    description: serviceFields.description.optional(),
    status: serviceFields.status.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.');

export const serviceIdParamsSchema = z.object({ id: objectIdSchema });
