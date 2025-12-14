import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './eventSlice';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
  },
});
