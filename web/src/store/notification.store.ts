import { create } from "zustand";
import type { Notification } from "../types/notification.types";

interface NotificationState {
  notifications: Notification[];

  unreadCount: number;

  addNotification: (
    notification: Notification
  ) => void;

  setNotifications: (
    notifications: Notification[]
  ) => void;

  setUnreadCount: (
    count: number
  ) => void;

  markAsRead: (
    notificationId: string
  ) => void;

  markAllAsRead: () => void;
}

export const useNotificationStore =
  create<NotificationState>((set) => ({
    notifications: [],

    unreadCount: 0,

    addNotification: (notification) =>
      set((state) => ({
        notifications: [
          notification,
          ...state.notifications,
        ],

        unreadCount: notification.read
          ? state.unreadCount
          : state.unreadCount + 1,
      })),

    setNotifications: (notifications) =>
      set({
        notifications,
      }),

    setUnreadCount: (count) =>
      set({
        unreadCount: count,
      }),

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
