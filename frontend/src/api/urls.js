import { apiClient } from './client.js';

export async function createUrl(payload) {
  const res = await apiClient.post('/api/urls', payload);
  return res.data;
}

export async function getUrls(params = {}) {
  const res = await apiClient.get('/api/urls', { params });
  return res.data;
}

export async function getUrlById(id) {
  const res = await apiClient.get(`/api/urls/${id}`);
  return res.data;
}

export async function getUrlByCode(code) {
  const res = await apiClient.get(`/api/urls/code/${code}`);
  return res.data;
}

export async function updateUrl(id, payload) {
  const res = await apiClient.patch(`/api/urls/${id}`, payload);
  return res.data;
}

export async function deleteUrl(id) {
  const res = await apiClient.delete(`/api/urls/${id}`);
  return res.data;
}

export async function bulkDeleteUrls(ids) {
  const res = await apiClient.post('/api/urls/bulk-delete', { ids });
  return res.data;
}

export async function bulkUpdateStatus(ids, isActive) {
  const res = await apiClient.post('/api/urls/bulk-status', { ids, isActive });
  return res.data;
}

export async function verifyPassword(code, password) {
  const res = await apiClient.post(`/api/urls/${code}/verify`, { password });
  return res.data;
}
