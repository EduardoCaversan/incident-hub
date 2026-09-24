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

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';

if (!supportedEnvironments.has(nodeEnv)) {
  throw new Error('NODE_ENV deve ser development, test ou production.');
}

export const env = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT?.trim() || '3000'),
  mongoUri: validateMongoUri(requireValue('MONGODB_URI')),
});
