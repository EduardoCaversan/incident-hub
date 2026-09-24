import { z } from 'zod';
import { objectIdSchema } from '../../shared/validation/schemas.js';
import { INCIDENT_SEVERITY_VALUES, INCIDENT_STATUS_VALUES } from './incident.constants.js';

const affectedServicesSchema = z
  .array(objectIdSchema, { error: 'Serviços afetados são obrigatórios.' })
  .min(1, 'Informe ao menos um serviço afetado.')
  .max(20, 'Um incidente pode afetar no máximo 20 serviços.')
  .refine((ids) => new Set(ids).size === ids.length, 'Não repita serviços afetados.');

const incidentFields = {
  title: z
    .string({ error: 'Título é obrigatório.' })
    .trim()
    .min(3, 'Título deve possuir ao menos 3 caracteres.')
    .max(150, 'Título deve possuir no máximo 150 caracteres.'),
  description: z
    .string({ error: 'Descrição é obrigatória.' })
    .trim()
    .min(3, 'Descrição deve possuir ao menos 3 caracteres.')
    .max(2000, 'Descrição deve possuir no máximo 2000 caracteres.'),
  severity: z.enum(INCIDENT_SEVERITY_VALUES, { error: 'Severidade inválida.' }),
  status: z.enum(INCIDENT_STATUS_VALUES, { error: 'Status de incidente inválido.' }),
  affectedServices: affectedServicesSchema,
  assignedTo: objectIdSchema.nullable(),
};

export const createIncidentSchema = z
  .object({
    title: incidentFields.title,
    description: incidentFields.description,
    severity: incidentFields.severity,
    status: incidentFields.status.optional(),
    affectedServices: incidentFields.affectedServices,
    assignedTo: incidentFields.assignedTo.optional(),
  })
  .strict();

export const updateIncidentSchema = z
  .object({
    title: incidentFields.title.optional(),
    description: incidentFields.description.optional(),
    severity: incidentFields.severity.optional(),
    status: incidentFields.status.optional(),
    affectedServices: incidentFields.affectedServices.optional(),
    assignedTo: incidentFields.assignedTo.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.');

export const incidentIdParamsSchema = z.object({ id: objectIdSchema });

export const listIncidentsQuerySchema = z
  .object({
    severity: incidentFields.severity.optional(),
    status: incidentFields.status.optional(),
    service: objectIdSchema.optional(),
    assignedTo: objectIdSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
