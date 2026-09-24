import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';

export function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
