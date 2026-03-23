"use client";

import { configureStore } from "@reduxjs/toolkit";
import vocabularyReducer from "@/lib/features/vocabularySlice";

export const store = configureStore({
  reducer: {
    vocabulary: vocabularyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
