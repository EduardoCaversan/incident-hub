import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { comparePassword, hashPassword } from '../../shared/security/password.js';
import { createAccessToken } from '../../shared/security/token.js';
import { createUser, findUserByEmail, userEmailExists } from '../users/user.repository.js';
import { USER_ROLES } from '../users/user.roles.js';

export async function registerUser({ name, email, password }) {
  if (await userEmailExists(email)) {
    throw emailAlreadyExistsError();
  }

  const passwordHash = await hashPassword(password);

  try {
    return await createUser({
      name,
      email,
      password: passwordHash,
      role: USER_ROLES.VIEWER,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw emailAlreadyExistsError();
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email, { includePassword: true });
  const passwordMatches = user && (await comparePassword(password, user.password));

  if (!passwordMatches) {
    throw new AppError('Email ou senha incorretos.', {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  }

  return {
    accessToken: createAccessToken(user),
    tokenType: 'Bearer',
    expiresIn: env.jwtExpiresIn,
    user,
  };
}

function emailAlreadyExistsError() {
  return new AppError('Já existe um usuário com este email.', {
    statusCode: 409,
    code: 'EMAIL_ALREADY_EXISTS',
  });
}
