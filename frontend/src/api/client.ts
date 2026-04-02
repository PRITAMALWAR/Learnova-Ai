import axios from 'axios';

/**
 * Axios base URL. Fixes a common 404: VITE_API_URL=http://localhost:5000
 * (no /api) would request /quizzes/... on the server instead of /api/quizzes/...
 */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return '/api';
  if (raw.startsWith('/')) {
    return raw.replace(/\/+$/, '') || '/api';
  }
  try {
    const u = new URL(raw);
    let path = u.pathname.replace(/\/+$/, '') || '';
    if (path === '' || path === '/') {
      u.pathname = '/api';
    }
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '');
  } catch {
    return '/api';
  }
}

const baseURL = resolveApiBase();

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
