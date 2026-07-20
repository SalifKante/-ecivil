import { apiClient } from '../../lib/apiClient';

export async function fetchStats() {
  const { data } = await apiClient.get('/staff/admin/stats');
  return data.stats;
}

export async function fetchStaffUsers(params = {}) {
  const { data } = await apiClient.get('/staff/admin/users', { params });
  return data.users;
}

export async function createStaffUser(payload) {
  const { data } = await apiClient.post('/staff/admin/users', payload);
  return data.user;
}

export async function updateStaffUser(id, patch) {
  const { data } = await apiClient.patch(`/staff/admin/users/${id}`, patch);
  return data.user;
}

export async function fetchAdminServices() {
  const { data } = await apiClient.get('/staff/admin/services');
  return data.services;
}

export async function createAdminService(payload) {
  const { data } = await apiClient.post('/staff/admin/services', payload);
  return data.service;
}

export async function updateAdminService(id, patch) {
  const { data } = await apiClient.patch(`/staff/admin/services/${id}`, patch);
  return data.service;
}
