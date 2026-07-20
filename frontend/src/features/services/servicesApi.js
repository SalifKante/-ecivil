import { apiClient } from '../../lib/apiClient';

export async function fetchModules() {
  const { data } = await apiClient.get('/services/modules');
  return data.modules;
}

export async function fetchServices(moduleKey) {
  const { data } = await apiClient.get('/services', {
    params: moduleKey ? { moduleKey } : undefined,
  });
  return data.services;
}

export async function fetchService(code) {
  const { data } = await apiClient.get(`/services/${code}`);
  return data.service;
}
