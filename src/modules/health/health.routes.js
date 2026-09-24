import { Router } from 'express';
import { healthCheck } from './health.controller.js';

export const healthRouter = Router();

healthRouter.get('/', healthCheck);
