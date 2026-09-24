import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

let server;

async function start() {
  try {
    await connectDatabase(env.mongoUri);
    server = app.listen(env.port, () => {
      console.info(`IncidentHub disponível na porta ${env.port}.`);
    });
  } catch (error) {
    console.error('Não foi possível iniciar a aplicação.', error);
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  console.info(`${signal} recebido. Encerrando a aplicação...`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
