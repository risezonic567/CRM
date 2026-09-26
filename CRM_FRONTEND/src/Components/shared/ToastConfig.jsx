import React from 'react';
import { Toaster } from 'react-hot-toast';

const ToastConfig = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 3500,
      style: {
        fontSize: '14px',
      },
    }}
  />
);

export default ToastConfig;
