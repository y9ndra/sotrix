import { create } from "zustand";

interface PresenceState {
  onlineUserIds: Set<string>;
  setOnlineUsers: (users: string[]) => void;
  addUser: (userId: string) => void;
  removeUser: (userId: string) => void;
  clearPresence: () => void;
  isOnline: (userId: string | undefined | null) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set<string>(),

  setOnlineUsers: (users) => {
    set({ onlineUserIds: new Set((users || []).map((u) => u.toString())) });
  },

  addUser: (userId) => {
    if (!userId) return;
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.add(userId.toString());
      return { onlineUserIds: next };
    });
  },

  removeUser: (userId) => {
    if (!userId) return;
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId.toString());
      return { onlineUserIds: next };
    });
  },

  clearPresence: () => {
    set({ onlineUserIds: new Set<string>() });
  },

  isOnline: (userId) => {
    if (!userId) return false;
    return get().onlineUserIds.has(userId.toString());
  },
}));
