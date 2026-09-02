import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
} from "../services/notification.service";
import { useNotificationStore } from "../store/notification.store";
import { useAuthStore } from "../store/authStore";
import { queryKeys } from "../lib/queryKeys";

export const useNotificationInitialization = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const setNotifications = useNotificationStore(
    (state) => state.setNotifications
  );
  const setUnreadCount = useNotificationStore(
    (state) => state.setUnreadCount
  );
  const isInitialized = useNotificationStore(
    (state) => state.isInitialized
  );
  const setInitialized = useNotificationStore(
    (state) => state.setInitialized
  );

  useEffect(() => {
    if (!isAuthenticated || isInitialized) return;

    const initializeNotifications = async () => {
      try {
        const [notificationsResponse, unreadCountResponse] =
          await Promise.all([
            getNotifications(),
            getUnreadCount(),
          ]);

        if (notificationsResponse && Array.isArray(notificationsResponse.data)) {
          setNotifications(notificationsResponse.data);

          // Seed TanStack Query cache so Notifications sheet opens immediately with data
          queryClient.setQueryData(queryKeys.notifications.all, {
            pages: [notificationsResponse],
            pageParams: [undefined],
          });
        }

        if (unreadCountResponse && unreadCountResponse.data && typeof unreadCountResponse.data.unreadCount === "number") {
          setUnreadCount(unreadCountResponse.data.unreadCount);

          queryClient.setQueryData(queryKeys.notifications.unreadCount, unreadCountResponse);
        }
      } catch (error) {
        console.error(
          "Failed to initialize notifications:",
          error
        );
      } finally {
        setInitialized(true);
      }
    };

    initializeNotifications();
  }, [
    isAuthenticated,
    isInitialized,
    setNotifications,
    setUnreadCount,
    setInitialized,
    queryClient,
  ]);
};
