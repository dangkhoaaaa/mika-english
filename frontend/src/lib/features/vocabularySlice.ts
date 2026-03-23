"use client";

import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { VocabularyItem } from "@/lib/types";

interface VocabularyState {
  items: VocabularyItem[];
  /** "" = học tất cả chủ đề */
  selectedTopic: string;
  currentCardIndex: number;
  showFront: boolean;
}

const initialState: VocabularyState = {
  items: [],
  selectedTopic: "",
  currentCardIndex: 0,
  showFront: true,
};

export function getVisibleItems(items: VocabularyItem[], selectedTopic: string): VocabularyItem[] {
  if (!selectedTopic) return items;
  return items.filter((i) => i.topic === selectedTopic);
}

function clampIndex(index: number, len: number) {
  if (len <= 0) return 0;
  return Math.min(index, len - 1);
}

type NewVocabulary = Omit<VocabularyItem, "id" | "createdAt">;

const vocabularySlice = createSlice({
  name: "vocabulary",
  initialState,
  reducers: {
    setVocabularies: (state, action: PayloadAction<VocabularyItem[]>) => {
      state.items = action.payload;
      state.currentCardIndex = 0;
      state.showFront = true;
    },
    setTopicFilter: (state, action: PayloadAction<string>) => {
      state.selectedTopic = action.payload;
      state.currentCardIndex = 0;
      state.showFront = true;
    },
    addVocabulary: {
      reducer: (state, action: PayloadAction<VocabularyItem>) => {
        state.items.unshift(action.payload);
      },
      prepare: (payload: NewVocabulary) => ({
        payload: {
          ...payload,
          topic: payload.topic ?? "",
          id: nanoid(),
          createdAt: new Date().toISOString(),
        },
      }),
    },
    updateVocabulary: (
      state,
      action: PayloadAction<{ id: string; data: NewVocabulary }>,
    ) => {
      state.items = state.items.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload.data } : item,
      );
    },
    deleteVocabulary: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      const vis = getVisibleItems(state.items, state.selectedTopic);
      state.currentCardIndex = clampIndex(state.currentCardIndex, vis.length);
    },
    importVocabularyBatch: {
      reducer: (state, action: PayloadAction<VocabularyItem[]>) => {
        state.items = [...action.payload, ...state.items];
        const vis = getVisibleItems(state.items, state.selectedTopic);
        state.currentCardIndex = clampIndex(state.currentCardIndex, vis.length);
      },
      prepare: (payload: NewVocabulary[]) => ({
        payload: payload.map((item) => ({
          ...item,
          topic: item.topic ?? "",
          id: nanoid(),
          createdAt: new Date().toISOString(),
        })),
      }),
    },
    nextCard: (state) => {
      const vis = getVisibleItems(state.items, state.selectedTopic);
      if (!vis.length) return;
      state.currentCardIndex = (state.currentCardIndex + 1) % vis.length;
      state.showFront = true;
    },
    prevCard: (state) => {
      const vis = getVisibleItems(state.items, state.selectedTopic);
      if (!vis.length) return;
      state.currentCardIndex =
        (state.currentCardIndex - 1 + vis.length) % vis.length;
      state.showFront = true;
    },
    flipCard: (state) => {
      const vis = getVisibleItems(state.items, state.selectedTopic);
      if (!vis.length) return;
      state.showFront = !state.showFront;
    },
    shuffleCards: (state) => {
      const topic = state.selectedTopic;
      const idxs = state.items
        .map((it, idx) => (!topic || it.topic === topic ? idx : -1))
        .filter((i) => i >= 0);
      if (!idxs.length) return;
      const picked = idxs.map((i) => state.items[i]);
      for (let i = picked.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [picked[i], picked[j]] = [picked[j], picked[i]];
      }
      idxs.forEach((idx, k) => {
        state.items[idx] = picked[k];
      });
      state.currentCardIndex = 0;
      state.showFront = true;
    },
  },
});

export const {
  setVocabularies,
  setTopicFilter,
  addVocabulary,
  updateVocabulary,
  deleteVocabulary,
  importVocabularyBatch,
  nextCard,
  prevCard,
  flipCard,
  shuffleCards,
} = vocabularySlice.actions;

export default vocabularySlice.reducer;
