import axios from 'axios';
import { DEMO_MODE, demoAdapter } from '../demo/demoAdapter';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

/**
 * The hosted demo has no backend, so requests are served from seeded data by a
 * custom adapter. Swapping the adapter rather than the calls keeps every feature
 * module unaware of which mode it is running in.
 */
if (DEMO_MODE) {
  apiClient.defaults.adapter = demoAdapter;
}

/**
 * Unwraps the backend's { error: { code, message } } shape into a flat object so
 * callers can map `code` to a French i18n key.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = error.response?.data?.error;

    return Promise.reject({
      code: apiError?.code ?? (error.response ? 'UNKNOWN_ERROR' : 'NETWORK_ERROR'),
      message: apiError?.message ?? error.message,
      details: apiError?.details,
      status: error.response?.status,
    });
  },
);
