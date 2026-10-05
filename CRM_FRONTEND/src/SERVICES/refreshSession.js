import axios from 'axios';

/**
 * App-wide single-flight refresh.
 * AuthBootstrap + Axios 401 interceptor MUST share this so Strict Mode /
 * parallel 401s cannot rotate the same cookie twice (200 + 401 race).
 */
let inFlight = null;

/**
 * @param {{ apiUrl: string, onAccessToken?: (token: string) => void }} opts
 * @returns {Promise<{ accessToken: string, user: object, expiresIn?: string }>}
 */
export function sharedRefreshSession({ apiUrl, onAccessToken } = {}) {
  if (!apiUrl) {
    return Promise.reject(new Error('API URL missing for refresh'));
  }

  if (!inFlight) {
    inFlight = axios
      .post(`${apiUrl}/api/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const data = res.data?.data;
        if (data?.accessToken && typeof onAccessToken === 'function') {
          onAccessToken(data.accessToken);
        }
        return data;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

export default sharedRefreshSession;
