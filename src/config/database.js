import mongoose from 'mongoose';

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.info('MongoDB conectado.');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function getDatabaseStatus() {
  return connectionStates[mongoose.connection.readyState] || 'unknown';
}
