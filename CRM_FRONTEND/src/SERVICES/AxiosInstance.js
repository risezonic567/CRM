import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.0.26:5000';

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

let refreshPromise = null;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    // Don't try refresh on login/refresh endpoints
    if (original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${API_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          )
          .then((res) => {
            const token = res.data?.data?.accessToken;
            if (token) accessTokenSetter(token);
            return token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const token = await refreshPromise;
      if (!token) {
        onUnauthorized();
        return Promise.reject(error);
      }

      original.headers.Authorization = `Bearer ${token}`;
      return axiosInstance(original);
    } catch (refreshErr) {
      onUnauthorized();
      return Promise.reject(refreshErr);
    }
  }
);

export default axiosInstance;
