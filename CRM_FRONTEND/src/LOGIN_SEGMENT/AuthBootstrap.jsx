import { useEffect, useRef } from 'react';
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
 * Keeps user logged in across tab refresh without using Socket.IO.
 */
const AuthBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const accessToken = useSelector(selectAccessToken);
  const sessionStatus = useSelector(selectSessionStatus);
  const [refresh] = useRefreshMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (accessToken) {
      dispatch(setSessionStatus('ready'));
      return;
    }

    dispatch(setSessionStatus('restoring'));
    refresh()
      .unwrap()
      .then((res) => {
        syncCurrentUserFromAuth(res?.data?.user);
      })
      .catch(() => {
        // No valid refresh cookie — stay logged out
      });
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
