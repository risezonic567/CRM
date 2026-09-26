import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './REDUX_FEATURES/STORE/store';
import LoginPage from './LOGIN_SEGMENT/LoginPage';
import ProtectedRoute from './LOGIN_SEGMENT/ProtectedRoute';
import AuthBootstrap from './LOGIN_SEGMENT/AuthBootstrap';
import SideBarDashboard from './Components/SideBarDashboard/SideBarDashboard';
import ToastConfig from './Components/shared/ToastConfig';

const App = () => {
  return (
    <Provider store={store}>
      <ToastConfig />
      <AuthBootstrap>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <SideBarDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthBootstrap>
    </Provider>
  );
};

export default App;
