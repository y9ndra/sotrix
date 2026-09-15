import { create } from "zustand";

interface LoadingState {
  isLoading: boolean;
  message: string | null;
  show: (message?: string) => void;
  hide: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: null,
  show: (message = "LOADING...") => set({ isLoading: true, message }),
  hide: () => set({ isLoading: false, message: null }),
}));
