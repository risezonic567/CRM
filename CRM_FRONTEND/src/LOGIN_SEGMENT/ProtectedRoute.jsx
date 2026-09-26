import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  selectIsAuthenticated,
  selectCurrentUser,
  selectSessionStatus,
} from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
import { syncCurrentUserFromAuth } from '../Components/roles';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const sessionStatus = useSelector(selectSessionStatus);
  const location = useLocation();

  useEffect(() => {
    syncCurrentUserFromAuth(user);
  }, [user]);

  // Wait until bootstrap finished — avoids false logout on F5
  if (sessionStatus !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Restoring session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
