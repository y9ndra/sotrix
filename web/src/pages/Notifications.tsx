import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service";
import type { Notification } from "../types/notification";

import { useNotificationStore } from "../store/notification.store";

const Notifications = () => {
  const queryClient = useQueryClient();
  const storeMarkAsRead = useNotificationStore((state) => state.markAsRead);
  const storeMarkAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  // Infinite query for notifications
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];

  // Mutation to mark a single notification as read
  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: (id: string) => {
      storeMarkAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  // Mutation to mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onMutate: () => {
      storeMarkAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification._id);
    }
  };

  const getActionText = (type: Notification["type"]) => {
    switch (type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "follow":
        return "started following you";
      default:
        return "interacted with you";
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div>
      <div className="notifications-container">
        <div className="notifications-header">
          {notifications.length > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || !hasUnread}
              className="btn-secondary"
            >
              {markAllReadMutation.isPending ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {error && <p style={{ color: "#dc2626", marginBottom: "16px" }}>Failed to load notifications</p>}

        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`notification-item ${notification.read ? "read" : "unread"}`}
            >
              <div className="notification-content">
                <div className="notification-avatar">
                  {notification.actor?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="notification-details">
                  <div className="notification-text">
                    <span className="notification-actor">
                      {notification.actor?.username || "Someone"}
                    </span>{" "}
                    <span className="notification-action-text">
                      {getActionText(notification.type)}
                    </span>
                  </div>
                  <span className="notification-time">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notification.read && (
                <div className="notification-status">
                  <div className="notification-dot"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {notifications.length === 0 && !isLoading && (
          <div className="notifications-empty">No notifications yet.</div>
        )}

        {isLoading && <p style={{ marginTop: "16px", textAlign: "center" }}>Loading notifications...</p>}

        {notifications.length > 0 && hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn-secondary"
            style={{ marginTop: "24px", width: "100%", padding: "10px" }}
          >
            {isFetchingNextPage ? "Loading more..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Notifications;
