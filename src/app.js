import express from 'express';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiDocument } from './config/openapi.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { userRouter } from './modules/users/user.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use('/health', healthRouter);
app.get('/api/docs.json', (_req, res) => res.json(openApiDocument));
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, { swaggerOptions: { persistAuthorization: true } }),
);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

app.use(notFound);
app.use(errorHandler);
