import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../shared/validation/validate.js';
import { getCurrentUser, getUser } from './user.controller.js';
import { USER_ROLES } from './user.roles.js';
import { userIdParamsSchema } from './user.validation.js';

export const userRouter = Router();

userRouter.get('/me', authenticate, getCurrentUser);
userRouter.get(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(userIdParamsSchema, 'params'),
  getUser,
);
