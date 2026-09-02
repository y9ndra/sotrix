import { create } from "zustand";
import type { Notification } from "../types/notification.types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isInitialized: boolean;

  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  setInitialized: (value: boolean) => void;
  resetNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isInitialized: false,

  setNotifications: (notifications) =>
    set((state) => {
      const map = new Map<string, Notification>();
      state.notifications.forEach((n) => {
        if (n && n._id) map.set(n._id.toString(), n);
      });

      notifications.forEach((n) => {
        if (n && n._id) map.set(n._id.toString(), n);
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        notifications: merged,
      };
    }),

  setInitialized: (value) =>
    set({
      isInitialized: value,
    }),

  addNotification: (notification) =>
    set((state) => {
      const alreadyExists = state.notifications.some(
        (item) => item._id?.toString() === notification._id?.toString()
      );

      if (alreadyExists) {
        return state;
      }

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.read
          ? state.unreadCount
          : state.unreadCount + 1,
      };
    }),

  setUnreadCount: (count) =>
    set({
      unreadCount: Math.max(0, count),
    }),

  incrementUnreadCount: () =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (notificationId) =>
    set((state) => {
      let wasUnread = false;
      const updated = state.notifications.map((item) => {
        if (item._id?.toString() === notificationId.toString()) {
          if (!item.read) wasUnread = true;
          return { ...item, read: true };
        }
        return item;
      });

      return {
        notifications: updated,
        unreadCount: wasUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
      unreadCount: 0,
    })),

  resetNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isInitialized: false,
    }),
}));
