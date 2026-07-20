import * as servicesService from './services.service.js';

export async function listModules(req, res) {
  const modules = await servicesService.listModulesWithCounts();
  res.json({ modules });
}

export async function listServices(req, res) {
  const { moduleKey } = req.validated?.query ?? {};
  const services = await servicesService.listServices({ moduleKey });
  res.json({ services });
}

export async function getService(req, res) {
  const service = await servicesService.getServiceByCode(req.params.code);
  res.json({ service });
}
