import { findUserById } from '../modules/users/user.repository.js';
import { AppError } from '../shared/errors/AppError.js';
import { verifyAccessToken } from '../shared/security/token.js';

export async function authenticate(req, _res, next) {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization?.split(' ') || [];

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Token de acesso não informado.', {
      statusCode: 401,
      code: 'TOKEN_REQUIRED',
    });
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Token de acesso inválido ou expirado.', {
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
  }

  if (typeof payload.sub !== 'string') {
    throw new AppError('Token de acesso inválido ou expirado.', {
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw new AppError('O usuário associado ao token não existe.', {
      statusCode: 401,
      code: 'TOKEN_USER_NOT_FOUND',
    });
  }

  req.user = user;
  return next();
}
