import { apiClient } from '../../lib/apiClient';

export async function createRequest({ serviceId, formData }) {
  const { data } = await apiClient.post('/requests', { serviceId, formData });
  return data.request;
}

export async function updateRequest(id, payload) {
  const { data } = await apiClient.patch(`/requests/${id}`, payload);
  return data.request;
}

export async function submitRequest(id) {
  const { data } = await apiClient.post(`/requests/${id}/submit`);
  return data.request;
}

export async function fetchRequest(id) {
  const { data } = await apiClient.get(`/requests/${id}`);
  return data.request;
}

export async function fetchRequests() {
  const { data } = await apiClient.get('/requests');
  return data.requests;
}

export async function uploadAttachment(id, file, label) {
  const form = new FormData();
  form.append('file', file);
  if (label) form.append('label', label);

  const { data } = await apiClient.post(`/requests/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.attachment;
}

export async function deleteAttachment(id, attachmentId) {
  await apiClient.delete(`/requests/${id}/attachments/${attachmentId}`);
}

/** Short-lived link to the issued document. Fetched on click, never stored. */
export async function fetchDocumentUrl(id) {
  const { data } = await apiClient.get(`/requests/${id}/document`);
  return data.url;
}
