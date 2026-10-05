import axios from 'axios';
import { sharedRefreshSession } from './refreshSession';

const API_URL = import.meta.env.VITE_API_URL;

export const axiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessTokenGetter = () => null;
let accessTokenSetter = () => {};
let onUnauthorized = () => {};

console.log('API_URL', API_URL);

export function bindAuthTokenHandlers({ getToken, setToken, onAuthFailure }) {
  accessTokenGetter = getToken;
  accessTokenSetter = setToken;
  onUnauthorized = onAuthFailure;
}

axiosInstance.interceptors.request.use((config) => {
  const token = accessTokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    if (
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const data = await sharedRefreshSession({
        apiUrl: API_URL,
        onAccessToken: accessTokenSetter,
      });
      const token = data?.accessToken;
      if (!token) {
        onUnauthorized();
        return Promise.reject(error);
      }

      original.headers.Authorization = `Bearer ${token}`;
      return axiosInstance(original);
    } catch (refreshErr) {
      const refreshStatus = refreshErr?.response?.status;
      if (refreshStatus === 401 || refreshStatus === 403) {
        onUnauthorized();
      }
      return Promise.reject(refreshErr);
    }
  }
);

export default axiosInstance;
