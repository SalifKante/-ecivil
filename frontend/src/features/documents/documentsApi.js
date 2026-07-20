import { apiClient } from '../../lib/apiClient';

/**
 * Public verification — no session required, so it deliberately does not go
 * through anything that assumes one. An unknown token is a normal 200 with
 * `valid: false`, not an error.
 */
export async function verifyDocument(qrToken) {
  const { data } = await apiClient.get(`/verify/${encodeURIComponent(qrToken)}`);
  return data;
}
