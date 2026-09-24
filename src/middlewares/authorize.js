import { AppError } from '../shared/errors/AppError.js';

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Você não possui permissão para acessar este recurso.', {
          statusCode: 403,
          code: 'FORBIDDEN',
        }),
      );
    }

    return next();
  };
}
