import { createSlice } from '@reduxjs/toolkit';
import { authApi } from './authApi';
import { disconnectSocket } from '../../../SERVICES/socket';

const initialState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  /** idle → restoring → ready (prevents false logout on refresh) */
  sessionStatus: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { accessToken, user } = action.payload;
      state.accessToken = accessToken;
      state.user = user;
      state.isAuthenticated = Boolean(accessToken && user);
      state.sessionStatus = 'ready';
    },
    setAccessToken(state, action) {
      state.accessToken = action.payload;
      if (!action.payload) {
        state.isAuthenticated = false;
      }
    },
    setSessionStatus(state, action) {
      state.sessionStatus = action.payload;
    },
    logout(state) {
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.sessionStatus = 'ready';
      // Only disconnect if a confirmation wait had opened a socket
      disconnectSocket();
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        const { accessToken, user } = action.payload.data;
        state.accessToken = accessToken;
        state.user = user;
        state.isAuthenticated = true;
        state.sessionStatus = 'ready';
      })
      .addMatcher(authApi.endpoints.refresh.matchFulfilled, (state, action) => {
        const { accessToken, user } = action.payload.data;
        state.accessToken = accessToken;
        state.user = user;
        state.isAuthenticated = true;
        state.sessionStatus = 'ready';
      })
      .addMatcher(authApi.endpoints.refresh.matchRejected, (state) => {
        // Stale bootstrap refresh can 401 after a successful login.
        // Never wipe an already-established session (Axios interceptor uses logout()).
        if (state.isAuthenticated && state.accessToken) {
          state.sessionStatus = 'ready';
          return;
        }
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.sessionStatus = 'ready';
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.sessionStatus = 'ready';
        disconnectSocket();
      })
      .addMatcher(authApi.endpoints.me.matchFulfilled, (state, action) => {
        state.user = action.payload.data.user;
        state.isAuthenticated = Boolean(state.accessToken);
      });
  },
});

export const { setCredentials, setAccessToken, setSessionStatus, logout } =
  authSlice.actions;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectSessionStatus = (state) => state.auth.sessionStatus;

export default authSlice.reducer;
