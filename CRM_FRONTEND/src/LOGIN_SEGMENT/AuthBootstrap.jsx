import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRefreshMutation } from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authApi';
import {
  selectAccessToken,
  selectSessionStatus,
  setSessionStatus,
} from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
import { syncCurrentUserFromAuth } from '../Components/roles';

/**
 * On app load: if no access token in memory, try refresh cookie once.
 * Aborts in-flight refresh on unmount / when accessToken appears so a late
 * 401 cannot wipe a successful login (Strict Mode / slow network race).
 */
const AuthBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const accessToken = useSelector(selectAccessToken);
  const sessionStatus = useSelector(selectSessionStatus);
  const [refresh] = useRefreshMutation();

  useEffect(() => {
    if (accessToken) {
      dispatch(setSessionStatus('ready'));
      return undefined;
    }

    let cancelled = false;
    dispatch(setSessionStatus('restoring'));
    const req = refresh();

    req
      .unwrap()
      .then((res) => {
        if (cancelled) return;
        syncCurrentUserFromAuth(res?.data?.user);
      })
      .catch(() => {
        // No valid refresh cookie / aborted — stay logged out
      })
      .finally(() => {
        if (!cancelled) {
          dispatch(setSessionStatus('ready'));
        }
      });

    return () => {
      cancelled = true;
      req.abort();
    };
  }, [accessToken, dispatch, refresh]);

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
