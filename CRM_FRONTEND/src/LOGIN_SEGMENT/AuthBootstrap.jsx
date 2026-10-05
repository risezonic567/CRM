import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAccessToken,
  selectSessionStatus,
  setCredentials,
  setSessionStatus,
} from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
import { syncCurrentUserFromAuth } from '../Components/roles';
import { sharedRefreshSession } from '../SERVICES/refreshSession';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * On app load: if no access token in memory, try refresh cookie once.
 * Uses sharedRefreshSession so Strict Mode / Axios interceptor cannot
 * fire a second competing refresh against the same cookie.
 */
const AuthBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const accessToken = useSelector(selectAccessToken);
  const sessionStatus = useSelector(selectSessionStatus);

  useEffect(() => {
    if (accessToken) {
      dispatch(setSessionStatus('ready'));
      return undefined;
    }

    let cancelled = false;
    dispatch(setSessionStatus('restoring'));

    sharedRefreshSession({
      apiUrl: API_URL,
      onAccessToken: () => {
        /* credentials set below with user */
      },
    })
      .then((data) => {
        if (cancelled) return;
        if (data?.accessToken && data?.user) {
          dispatch(
            setCredentials({
              accessToken: data.accessToken,
              user: data.user,
            })
          );
          syncCurrentUserFromAuth(data.user);
        }
      })
      .catch(() => {
        // No valid refresh cookie — stay logged out
      })
      .finally(() => {
        if (!cancelled) {
          dispatch(setSessionStatus('ready'));
        }
      });

    // Do NOT abort the shared in-flight refresh on unmount (Strict Mode).
    // Aborting caused cookie rotation races (200 then 401).
    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch]);

  if (sessionStatus === 'idle' || sessionStatus === 'restoring') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Restoring session…
      </div>
    );
  }

  return children;
};

export default AuthBootstrap;
