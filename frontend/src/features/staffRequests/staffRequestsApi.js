import { apiClient } from '../../lib/apiClient';

/** Drops empty filters so they do not reach the API as blank query params. */
function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
}

export async function fetchStaffRequests(params = {}) {
  const { data } = await apiClient.get('/staff/requests', { params: clean(params) });
  return data;
}

export async function fetchStaffRequest(id) {
  const { data } = await apiClient.get(`/staff/requests/${id}`);
  return data.request;
}

export async function assignStaffRequest(id) {
  const { data } = await apiClient.post(`/staff/requests/${id}/assign`);
  return data.request;
}

export async function approveStaffRequest(id, note) {
  const { data } = await apiClient.post(`/staff/requests/${id}/approve`, { note });
  return data.request;
}

export async function rejectStaffRequest(id, reason) {
  const { data } = await apiClient.post(`/staff/requests/${id}/reject`, { reason });
  return data.request;
}

export async function requestMoreInfo(id, note) {
  const { data } = await apiClient.post(`/staff/requests/${id}/request-info`, { note });
  return data.request;
}

export async function fetchStaffAttachmentUrl(id, attachmentId) {
  const { data } = await apiClient.get(`/staff/requests/${id}/attachments/${attachmentId}/url`);
  return data.url;
}
