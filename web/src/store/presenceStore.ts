import { create } from "zustand";

interface PresenceState {
  onlineUserIds: Set<string>;
  setOnlineUsers: (users: (string | { userId?: string; id?: string; _id?: string })[]) => void;
  addUser: (raw: string | { userId?: string; id?: string; _id?: string }) => void;
  removeUser: (raw: string | { userId?: string; id?: string; _id?: string }) => void;
  clearPresence: () => void;
  isOnline: (userId: string | undefined | null) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set<string>(),

  setOnlineUsers: (users) => {
    const ids = (users || [])
      .map((u) => {
        if (typeof u === "object" && u !== null) {
          return (u.userId || u.id || u._id || "").toString();
        }
        return (u || "").toString();
      })
      .filter(Boolean);
    set({ onlineUserIds: new Set(ids) });
  },

  addUser: (raw) => {
    const id = typeof raw === "object" && raw !== null ? (raw.userId || raw.id || raw._id) : raw;
    if (!id) return;
    const idStr = id.toString();
    set((state) => {
      if (state.onlineUserIds.has(idStr)) return state;
      const next = new Set(state.onlineUserIds);
      next.add(idStr);
      return { onlineUserIds: next };
    });
  },

  removeUser: (raw) => {
    const id = typeof raw === "object" && raw !== null ? (raw.userId || raw.id || raw._id) : raw;
    if (!id) return;
    const idStr = id.toString();
    set((state) => {
      if (!state.onlineUserIds.has(idStr)) return state;
      const next = new Set(state.onlineUserIds);
      next.delete(idStr);
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
