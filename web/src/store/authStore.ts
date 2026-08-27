import { create } from "zustand";
import type { User } from "../types/user.types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setUser: (user: User) => void;
  clearUser: () => void;
  setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isInitialized: true,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
    }),

  setInitialized: (val) =>
    set({
      isInitialized: val,
    }),
}));
