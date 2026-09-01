import { useEffect } from "react";
import { getSocket } from "../services/socket.service";
import { useNotificationStore } from "../store/notification.store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import type { Notification } from "../types/notification.types";

export const useNotificationSocket = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const handleNewNotification = (notification: Notification) => {
      console.log("🔔 Real-time notification received via hook:", notification);
      addNotification(notification);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [addNotification, queryClient]);
};
