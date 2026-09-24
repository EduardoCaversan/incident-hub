import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../shared/validation/validate.js';
import { USER_ROLES } from '../users/user.roles.js';
import { create, getById, list, remove, update } from './incident.controller.js';
import {
  createIncidentSchema,
  incidentIdParamsSchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from './incident.validation.js';

export const incidentRouter = Router();

incidentRouter.use(authenticate);
incidentRouter.get('/', validate(listIncidentsQuerySchema, 'query'), list);
incidentRouter.get('/:id', validate(incidentIdParamsSchema, 'params'), getById);
incidentRouter.post(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.ENGINEER),
  validate(createIncidentSchema),
  create,
);
incidentRouter.patch(
  '/:id',
  authorize(USER_ROLES.ADMIN, USER_ROLES.ENGINEER),
  validate(incidentIdParamsSchema, 'params'),
  validate(updateIncidentSchema),
  update,
);
incidentRouter.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(incidentIdParamsSchema, 'params'),
  remove,
);
