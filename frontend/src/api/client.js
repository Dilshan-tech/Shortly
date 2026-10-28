import axios from 'axios';

// In Vite development, relative /api paths proxy automatically to the backend.
// In production or custom builds, VITE_API_BASE can point to the backend domain.
const baseURL = import.meta.env.VITE_API_BASE || '';

export const apiClient = axios.create({
  baseURL,
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
