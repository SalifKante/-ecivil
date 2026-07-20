import { apiClient } from '../../lib/apiClient';

export async function requestOtp(nina) {
  const { data } = await apiClient.post('/auth/otp/request', { nina });
  return data;
}

export async function verifyOtp({ nina, code }) {
  const { data } = await apiClient.post('/auth/otp/verify', { nina, code });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.citizen;
}
