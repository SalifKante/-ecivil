import { apiClient } from '../../lib/apiClient';

export async function staffLogin({ email, password }) {
  const { data } = await apiClient.post('/staff/auth/login', { email, password });
  return data;
}

export async function fetchStaffMe() {
  const { data } = await apiClient.get('/staff/auth/me');
  return data.user;
}
