import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const supportedEnvironments = new Set(['development', 'test', 'production']);

function requireValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`A variável de ambiente ${name} é obrigatória.`);
  }

  return value;
}

function parsePort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('A variável de ambiente PORT deve ser um número entre 1 e 65535.');
  }

  return port;
}

function validateMongoUri(value) {
  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    throw new Error('A variável de ambiente MONGODB_URI deve ser uma URI válida do MongoDB.');
  }

  return value;
}

function validateJwtSecret(value) {
  if (value.length < 32) {
    throw new Error('A variável de ambiente JWT_SECRET deve possuir ao menos 32 caracteres.');
  }

  return value;
}

function validateJwtExpiration(value) {
  if (!/^\d+[smhd]$/.test(value)) {
    throw new Error('JWT_EXPIRES_IN deve usar um número seguido de s, m, h ou d.');
  }

  return value;
}

function parseBcryptRounds(value) {
  const rounds = Number(value);

  if (!Number.isInteger(rounds) || rounds < 4 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS deve ser um número inteiro entre 4 e 15.');
  }

  return rounds;
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';

if (!supportedEnvironments.has(nodeEnv)) {
  throw new Error('NODE_ENV deve ser development, test ou production.');
}

export const env = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT?.trim() || '3000'),
  mongoUri: validateMongoUri(requireValue('MONGODB_URI')),
  jwtSecret: validateJwtSecret(requireValue('JWT_SECRET')),
  jwtExpiresIn: validateJwtExpiration(process.env.JWT_EXPIRES_IN?.trim() || '1h'),
  bcryptRounds: parseBcryptRounds(process.env.BCRYPT_ROUNDS?.trim() || '12'),
});
