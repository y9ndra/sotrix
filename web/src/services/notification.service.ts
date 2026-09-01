import api from "./api";
import type { Notification } from "../types/notification";

export interface PaginatedNotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

export const getNotifications = async (
  cursor?: string,
  limit: number = 10
): Promise<PaginatedNotificationsResponse> => {
  const response = await api.get("/notifications", {
    params: { cursor, limit },
  });
  return response.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await api.get("/notifications/unread-count");
  return response.data;
};

export const markAsRead = async (id: string): Promise<any> => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markNotificationAsRead = markAsRead;

export const markAllAsRead = async (): Promise<any> => {
  const response = await api.patch("/notifications/read-all");
  return response.data;
};

export const markAllNotificationsAsRead = markAllAsRead;
