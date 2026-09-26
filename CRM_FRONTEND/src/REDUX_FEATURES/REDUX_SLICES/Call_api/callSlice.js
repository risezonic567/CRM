import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  filters: {
    disposition: '',
    search: '',
  },
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setCallFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetCallFilters(state) {
      state.filters = initialState.filters;
    },
  },
});

export const { setCallFilters, resetCallFilters } = callSlice.actions;
export const selectCallFilters = (state) => state.call.filters;
export default callSlice.reducer;
