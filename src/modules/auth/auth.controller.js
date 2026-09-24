import { loginUser, registerUser } from './auth.service.js';

export async function register(req, res) {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const authentication = await loginUser(req.body);
  res.status(200).json(authentication);
}
