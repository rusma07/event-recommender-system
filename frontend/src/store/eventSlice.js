import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  events: [],
  loading: true,
  search: '',
  selectedTags: [],
  currentPage: 1,
  eventsPerPage: 5,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setEvents: (state, action) => { state.events = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setSearch: (state, action) => { state.search = action.payload; },
    setSelectedTags: (state, action) => { state.selectedTags = action.payload; },
    setCurrentPage: (state, action) => { state.currentPage = action.payload; },
  },
});

export const { setEvents, setLoading, setSearch, setSelectedTags, setCurrentPage } = dashboardSlice.actions;
export default dashboardSlice.reducer;
