import { createSlice } from '@reduxjs/toolkit';

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    lastResults: null,
    agencyDefaults: null,
    source: null,
    meta: null,
  },
  reducers: {
    setSearchResults(state, action) {
      state.lastResults = action.payload?.offers || [];
      state.agencyDefaults = action.payload?.agencyDefaults || null;
      state.source = action.payload?.source || null;
      state.meta = action.payload?.meta || null;
    },
    clearSearchResults(state) {
      state.lastResults = [];
      state.source = null;
      state.meta = null;
    },
  },
});

export const { setSearchResults, clearSearchResults } = searchSlice.actions;
export default searchSlice.reducer;
