import { AppError } from '../shared/errors/AppError.js';

export function notFound(req, _res, next) {
  next(
    new AppError(`Rota ${req.method} ${req.originalUrl} não encontrada.`, {
      statusCode: 404,
      code: 'ROUTE_NOT_FOUND',
    }),
  );
}
