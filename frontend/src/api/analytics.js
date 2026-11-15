import { apiClient } from './client.js';

function normalizeParams(options) {
  if (typeof options === 'number' || typeof options === 'string') {
    return { range: typeof options === 'number' ? `${options}d` : options };
  }
  return options || {};
}

export async function getSummary(params = {}) {
  const cleanParams = normalizeParams(params);
  const res = await apiClient.get('/api/analytics/summary', { params: cleanParams });
  return res.data;
}

export async function getTimeseries(rangeOrDays = '7d', urlId = null, extraParams = {}) {
  let params = {};
  if (typeof rangeOrDays === 'object' && rangeOrDays !== null) {
    params = { ...rangeOrDays };
  } else {
    params = {
      range: typeof rangeOrDays === 'number' ? `${rangeOrDays}d` : rangeOrDays,
      ...(urlId ? { urlId } : {}),
      ...extraParams
    };
  }
  const res = await apiClient.get('/api/analytics/timeseries', { params });
  return res.data;
}

export async function getDevices(urlId = null, extraParams = {}) {
  const params = typeof urlId === 'object' && urlId !== null ? urlId : { ...(urlId ? { urlId } : {}), ...extraParams };
  const res = await apiClient.get('/api/analytics/devices', { params });
  return res.data;
}

export async function getBrowsers(urlId = null, extraParams = {}) {
  const params = typeof urlId === 'object' && urlId !== null ? urlId : { ...(urlId ? { urlId } : {}), ...extraParams };
  const res = await apiClient.get('/api/analytics/browsers', { params });
  return res.data;
}

export async function getOs(urlId = null, extraParams = {}) {
  const params = typeof urlId === 'object' && urlId !== null ? urlId : { ...(urlId ? { urlId } : {}), ...extraParams };
  const res = await apiClient.get('/api/analytics/os', { params });
  return res.data;
}

export async function getReferrers(urlId = null, extraParams = {}) {
  const params = typeof urlId === 'object' && urlId !== null ? urlId : { ...(urlId ? { urlId } : {}), ...extraParams };
  const res = await apiClient.get('/api/analytics/referrers', { params });
  return res.data;
}

export async function getCountries(urlId = null, extraParams = {}) {
  const params = typeof urlId === 'object' && urlId !== null ? urlId : { ...(urlId ? { urlId } : {}), ...extraParams };
  const res = await apiClient.get('/api/analytics/countries', { params });
  return res.data;
}

export async function getClicks(params = {}) {
  const res = await apiClient.get('/api/analytics/clicks', { params });
  return res.data;
}

export async function getUrlAnalytics(id, rangeOrOptions = '30d') {
  let params = {};
  if (typeof rangeOrOptions === 'object' && rangeOrOptions !== null) {
    params = { ...rangeOrOptions };
  } else if (typeof rangeOrOptions === 'number') {
    params = { range: `${rangeOrOptions}d` };
  } else {
    params = { range: rangeOrOptions };
  }
  const res = await apiClient.get(`/api/urls/${id}/analytics`, { params });
  return res.data;
}

export async function downloadCsvExport(urlId = null, options = {}) {
  const params = {
    ...(urlId ? { urlId } : {}),
    ...options
  };
  const res = await apiClient.get('/api/analytics/export', {
    params,
    responseType: 'blob'
  });

  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = urlId ? `shortly-analytics-${urlId}.csv` : `shortly-analytics-export.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
}

export async function getHealth() {
  const res = await apiClient.get('/api/health');
  return res.data;
}
