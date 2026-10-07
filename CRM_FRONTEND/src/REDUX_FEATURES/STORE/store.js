import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer, { setAccessToken, logout } from '../REDUX_SLICES/Auth_api/authSlice';
import { authApi } from '../REDUX_SLICES/Auth_api/authApi';
import callReducer from '../REDUX_SLICES/Call_api/callSlice';
import { callApi } from '../REDUX_SLICES/Call_api/callApi';
import inquiryReducer from '../REDUX_SLICES/Inquiry_api/inquirySlice';
import { inquiryApi } from '../REDUX_SLICES/Inquiry_api/inquiryApi';
import userReducer from '../REDUX_SLICES/User_api/userSlice';
import { userApi } from '../REDUX_SLICES/User_api/userApi';
import { bindAuthTokenHandlers } from '../../SERVICES/AxiosInstance';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    call: callReducer,
    inquiry: inquiryReducer,
    user: userReducer,
    [authApi.reducerPath]: authApi.reducer,
    [callApi.reducerPath]: callApi.reducer,
    [inquiryApi.reducerPath]: inquiryApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      callApi.middleware,
      inquiryApi.middleware,
      userApi.middleware
    ),
});

bindAuthTokenHandlers({
  getToken: () => store.getState().auth.accessToken,
  setToken: (token) => store.dispatch(setAccessToken(token)),
  onAuthFailure: () => store.dispatch(logout()),
});

setupListeners(store.dispatch);

export default store;
