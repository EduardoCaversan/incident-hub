import { getDatabaseStatus } from '../../config/database.js';

export function getHealthStatus() {
  const databaseStatus = getDatabaseStatus();
  const healthy = databaseStatus === 'connected';

  return {
    httpStatus: healthy ? 200 : 503,
    payload: {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: databaseStatus,
      },
    },
  };
}
