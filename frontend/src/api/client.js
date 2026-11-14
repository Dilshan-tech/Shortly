import axios from 'axios';
import { appConfig } from '../config/appConfig.js';

// Centralized API client: uses appConfig.apiBaseUrl (defaults to '' for relative /api proxy)
export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Format error message from backend
export function extractErrorMessage(err) {
  if (err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err.message === 'Network Error') {
    return 'Cannot connect to Shortly backend server. Please verify it is running.';
  }
  return err.message || 'An unexpected error occurred';
}
