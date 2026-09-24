import { AppError } from '../../shared/errors/AppError.js';
import { findUserById } from './user.repository.js';

export async function getUserById(id) {
  const user = await findUserById(id);

  if (!user) {
    throw new AppError('Usuário não encontrado.', {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  }

  return user;
}
