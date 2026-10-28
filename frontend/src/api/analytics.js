import { apiClient } from './client.js';

export async function getSummary() {
  const res = await apiClient.get('/api/analytics/summary');
  return res.data;
}

export async function getTimeseries(days = 7, urlId = null) {
  const params = { days };
  if (urlId) params.urlId = urlId;
  const res = await apiClient.get('/api/analytics/timeseries', { params });
  return res.data;
}

export async function getDevices(urlId = null) {
  const params = urlId ? { urlId } : {};
  const res = await apiClient.get('/api/analytics/devices', { params });
  return res.data;
}

export async function getBrowsers(urlId = null) {
  const params = urlId ? { urlId } : {};
  const res = await apiClient.get('/api/analytics/browsers', { params });
  return res.data;
}

export async function getReferrers(urlId = null) {
  const params = urlId ? { urlId } : {};
  const res = await apiClient.get('/api/analytics/referrers', { params });
  return res.data;
}

export async function getUrlAnalytics(id, days = 30) {
  const res = await apiClient.get(`/api/urls/${id}/analytics`, { params: { days } });
  return res.data;
}

export async function getHealth() {
  const res = await apiClient.get('/api/health');
  return res.data;
}
