import * as staffAuthService from './staffAuth.service.js';

export async function login(req, res) {
  const result = await staffAuthService.login({
    email: req.body.email,
    password: req.body.password,
    ip: req.ip,
  });
  res.json(result);
}

export async function me(req, res) {
  const user = await staffAuthService.getProfile(req.auth.id);
  res.json({ user });
}
