import { User } from './user.model.js';

export function createUser(data) {
  return User.create(data);
}

export function findUserByEmail(email, { includePassword = false } = {}) {
  const query = User.findOne({ email });
  return includePassword ? query.select('+password') : query;
}

export function findUserById(id) {
  return User.findById(id);
}

export async function userEmailExists(email) {
  return Boolean(await User.exists({ email }));
}
