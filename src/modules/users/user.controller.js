import { getUserById } from './user.service.js';

export function getCurrentUser(req, res) {
  res.status(200).json({ user: req.user });
}

export async function getUser(req, res) {
  const user = await getUserById(req.params.id);
  res.status(200).json({ user });
}
