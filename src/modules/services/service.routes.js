import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../shared/validation/validate.js';
import { USER_ROLES } from '../users/user.roles.js';
import { create, getById, list, remove, update } from './service.controller.js';
import {
  createServiceSchema,
  serviceIdParamsSchema,
  updateServiceSchema,
} from './service.validation.js';

export const serviceRouter = Router();

serviceRouter.use(authenticate);
serviceRouter.get('/', list);
serviceRouter.get('/:id', validate(serviceIdParamsSchema, 'params'), getById);
serviceRouter.post('/', authorize(USER_ROLES.ADMIN), validate(createServiceSchema), create);
serviceRouter.patch(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(serviceIdParamsSchema, 'params'),
  validate(updateServiceSchema),
  update,
);
serviceRouter.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(serviceIdParamsSchema, 'params'),
  remove,
);
