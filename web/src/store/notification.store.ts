import { create } from "zustand";
import type { Notification } from "../types/notification.types";

interface NotificationState {
  notifications: Notification[];

  unreadCount: number;

  isInitialized: boolean;

  setNotifications: (
    notifications: Notification[]
  ) => void;

  addNotification: (
    notification: Notification
  ) => void;

  setUnreadCount: (
    count: number
  ) => void;

  incrementUnreadCount: () => void;

  markAsRead: (
    notificationId: string
  ) => void;

  markAllAsRead: () => void;

  setInitialized: (
    value: boolean
  ) => void;
}

export const useNotificationStore =
  create<NotificationState>((set) => ({
    notifications: [],

    unreadCount: 0,

    isInitialized: false,

    setNotifications: (notifications) =>
      set((state) => {
        const existingIds = new Set(
          state.notifications.map(
            (notification) => notification._id
          )
        );

        const newNotifications =
          notifications.filter(
            (notification) =>
              !existingIds.has(notification._id)
          );

        return {
          notifications: [
            ...state.notifications,
            ...newNotifications,
          ],
        };
      }),

    setInitialized: (value) =>
      set({
        isInitialized: value,
      }),

    addNotification: (notification) =>
      set((state) => {
        const alreadyExists = state.notifications.some(
          (item) => item._id === notification._id
        );

        if (alreadyExists) {
          return state;
        }

        return {
          notifications: [
            notification,
            ...state.notifications,
          ],
          unreadCount: notification.read
            ? state.unreadCount
            : state.unreadCount + 1,
        };
      }),

    setUnreadCount: (count) =>
      set({
        unreadCount: count,
      }),

    incrementUnreadCount: () =>
      set((state) => ({
        unreadCount: state.unreadCount + 1,
      })),

    markAsRead: (notificationId) =>
      set((state) => {
        const notification =
          state.notifications.find(
            (item) =>
              item._id === notificationId
          );

        return {
          notifications:
            state.notifications.map(
              (item) =>
                item._id === notificationId
                  ? {
                      ...item,
                      read: true,
                    }
                  : item
            ),

          unreadCount:
            notification && !notification.read
              ? Math.max(
                  0,
                  state.unreadCount - 1
                )
              : state.unreadCount,
        };
      }),

    markAllAsRead: () =>
      set((state) => ({
        notifications:
          state.notifications.map(
            (notification) => ({
              ...notification,
              read: true,
            })
          ),

        unreadCount: 0,
      })),
  }));
