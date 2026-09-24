import { getHealthStatus } from './health.service.js';

export function healthCheck(_req, res) {
  const { httpStatus, payload } = getHealthStatus();
  res.status(httpStatus).json(payload);
}
