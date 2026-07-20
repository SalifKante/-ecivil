import * as adminService from './admin.service.js';
import * as statsService from './stats.service.js';

export async function listUsers(req, res) {
  const users = await adminService.listUsers({ auth: req.auth, ...req.validated.query });
  res.json({ users });
}

export async function createUser(req, res) {
  const user = await adminService.createUser({ auth: req.auth, ...req.body, ip: req.ip });
  res.status(201).json({ user });
}

export async function updateUser(req, res) {
  const user = await adminService.updateUser({
    auth: req.auth,
    userId: req.params.id,
    patch: req.body,
    ip: req.ip,
  });
  res.json({ user });
}

export async function listServices(req, res) {
  const services = await adminService.listServices({ auth: req.auth });
  res.json({ services });
}

export async function createService(req, res) {
  const service = await adminService.createService({ auth: req.auth, data: req.body, ip: req.ip });
  res.status(201).json({ service });
}

export async function updateService(req, res) {
  const service = await adminService.updateService({
    auth: req.auth,
    serviceId: req.params.id,
    patch: req.body,
    ip: req.ip,
  });
  res.json({ service });
}

export async function getStats(req, res) {
  const stats = await statsService.getStats({ auth: req.auth });
  res.json({ stats });
}
