import { env } from '../config/env.js';
import { AppError } from '../shared/errors/AppError.js';

export function errorHandler(error, _req, res, _next) {
  const normalizedError = normalizeError(error);

  if (normalizedError.statusCode >= 500) {
    console.error(error);
  }

  const body = {
    error: {
      code: normalizedError.code,
      message:
        normalizedError.statusCode >= 500 && env.nodeEnv === 'production'
          ? 'Ocorreu um erro interno.'
          : normalizedError.message,
    },
  };

  if (normalizedError.details !== undefined) {
    body.error.details = normalizedError.details;
  }

  res.status(normalizedError.statusCode).json(body);
}

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.type === 'entity.parse.failed') {
    return new AppError('O corpo da requisição contém JSON inválido.', {
      statusCode: 400,
      code: 'INVALID_JSON',
    });
  }

  if (error?.type === 'entity.too.large') {
    return new AppError('O corpo da requisição excede o limite permitido.', {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  return new AppError(error?.message || 'Ocorreu um erro interno.');
}
