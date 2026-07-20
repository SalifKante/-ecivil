import { Service } from '../../models/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { MODULE_KEYS } from '../../constants/index.js';

/** Public catalog listing. Only active services, grouped-friendly ordering. */
export async function listServices({ moduleKey } = {}) {
  const filter = { isActive: true };
  if (moduleKey) filter.moduleKey = moduleKey;

  return Service.find(filter).sort({ moduleKey: 1, fee: 1 }).lean();
}

/** The four modules with their service counts — powers the catalog landing. */
export async function listModulesWithCounts() {
  const counts = await Service.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$moduleKey', count: { $sum: 1 }, partner: { $first: '$partner' } } },
  ]);

  const byKey = Object.fromEntries(counts.map((c) => [c._id, c]));
  return Object.values(MODULE_KEYS).map((key) => ({
    moduleKey: key,
    serviceCount: byKey[key]?.count ?? 0,
    partner: byKey[key]?.partner ?? null,
  }));
}

export async function getServiceByCode(code) {
  const service = await Service.findOne({ code, isActive: true }).lean();
  if (!service) throw ApiError.notFound('SERVICE_NOT_FOUND', `Unknown service: ${code}`);
  return service;
}

export async function getServiceById(id) {
  const service = await Service.findById(id).lean();
  if (!service || !service.isActive) {
    throw ApiError.notFound('SERVICE_NOT_FOUND', 'Service not found');
  }
  return service;
}
