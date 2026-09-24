import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiDocument } from './config/openapi.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { incidentRouter } from './modules/incidents/incident.routes.js';
import { serviceRouter } from './modules/services/service.routes.js';
import { userRouter } from './modules/users/user.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));

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
app.use('/api/services', serviceRouter);
app.use('/api/incidents', incidentRouter);

app.use(notFound);
app.use(errorHandler);
