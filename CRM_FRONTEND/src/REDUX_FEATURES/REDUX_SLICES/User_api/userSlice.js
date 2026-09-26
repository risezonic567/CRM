import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    selectedUserId: null,
  },
  reducers: {
    setSelectedUserId(state, action) {
      state.selectedUserId = action.payload;
    },
  },
});

export const { setSelectedUserId } = userSlice.actions;
export default userSlice.reducer;
