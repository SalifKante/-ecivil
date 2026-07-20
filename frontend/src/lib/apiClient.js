import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

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
