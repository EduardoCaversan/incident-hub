import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const tokenOptions = {
  algorithm: 'HS256',
  audience: 'incident-hub-api',
  issuer: 'incident-hub',
};

export function createAccessToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    ...tokenOptions,
    expiresIn: env.jwtExpiresIn,
    subject: user.id,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, tokenOptions);
}
