import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service";
import type { Notification } from "../types/notification";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../store/notification.store";

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeNotifications = useNotificationStore((state) => state.notifications);
  const storeUnreadCount = useNotificationStore((state) => state.unreadCount);
  const storeMarkAsRead = useNotificationStore((state) => state.markAsRead);
  const storeMarkAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const setStoreNotifications = useNotificationStore((state) => state.setNotifications);

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
    refetchOnMount: "always",
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const queryNotifications = useMemo<Notification[]>(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  // Keep Zustand store in sync with TanStack Query data
  useEffect(() => {
    if (queryNotifications.length > 0) {
      setStoreNotifications(queryNotifications);
    }
  }, [queryNotifications, setStoreNotifications]);

  // Merge query notifications with real-time notifications in store to guarantee instant consistency
  const notifications = useMemo<Notification[]>(() => {
    const notificationsMap = new Map<string, Notification>();
    queryNotifications.forEach((n: Notification) => {
      if (n && n._id) {
        notificationsMap.set(n._id.toString(), n);
      }
    });

    storeNotifications.forEach((n: Notification) => {
      if (n && n._id) {
        const idStr = n._id.toString();
        if (!notificationsMap.has(idStr)) {
          notificationsMap.set(idStr, n);
        } else {
          // If either source indicates unread (false), keep it unread (false)
          const existing = notificationsMap.get(idStr)!;
          notificationsMap.set(idStr, {
            ...existing,
            ...n,
            read: existing.read && n.read,
          });
        }
      }
    });

    return Array.from(notificationsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [queryNotifications, storeNotifications]);

  // Mutation to mark a single notification as read
  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: (id: string) => {
      // 1. Update Zustand store
      storeMarkAsRead(id);

      // 2. Optimistically update TanStack query infinite list
      queryClient.setQueryData<any>(queryKeys.notifications.all, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((n: any) =>
              n._id?.toString() === id.toString() ? { ...n, read: true } : n
            ),
          })),
        };
      });

      // 3. Optimistically update TanStack query unread count
      queryClient.setQueryData(queryKeys.notifications.unreadCount, (old: any) => ({
        success: true,
        data: {
          unreadCount: Math.max(0, (old?.data?.unreadCount ?? 1) - 1),
        },
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  // Mutation to mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onMutate: () => {
      // 1. Update Zustand store
      storeMarkAllAsRead();

      // 2. Optimistically update TanStack query infinite list
      queryClient.setQueryData<any>(queryKeys.notifications.all, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((n: any) => ({ ...n, read: true })),
          })),
        };
      });

      // 3. Optimistically set unread count to 0
      queryClient.setQueryData(queryKeys.notifications.unreadCount, {
        success: true,
        data: { unreadCount: 0 },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  const getNotificationDestination = (notification: Notification): string | null => {
    switch (notification.type) {
      case "follow":
        return notification.actor
          ? `/profile/${notification.actor._id || (notification.actor as any).id || notification.actor.username}`
          : null;
      case "like":
      case "comment":
        if (notification.actor) {
          return `/profile/${notification.actor._id || (notification.actor as any).id || notification.actor.username}`;
        }
        return null;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification._id);
    }

    const destination = getNotificationDestination(notification);
    if (destination) {
      navigate(destination);
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

  const hasUnread = notifications.some((n: Notification) => !n.read) || storeUnreadCount > 0;

  return (
    <div>
      <div className="notifications-container">
        <div className="notifications-header">
          {notifications.length > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || !hasUnread}
              className="btn"
              style={{ width: "auto", padding: "6px 14px", fontSize: "12px" }}
            >
              {markAllReadMutation.isPending ? "marking..." : "mark all read"}
            </button>
          )}
        </div>

        {error && <p style={{ color: "#ef4444", marginBottom: "16px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>Failed to load notifications</p>}

        <div className="notifications-list">
          {notifications.map((notification: Notification) => {
            const actorName =
              notification.actor?.name?.trim() ||
              notification.actor?.username ||
              "someone";
            const actorInitial = actorName.charAt(0).toUpperCase();

            return (
              <div
                key={notification._id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }
                }}
                className={`notification-item ${notification.read ? "read" : "unread"}`}
              >
                <div className="notification-content">
                  <div className="notification-avatar">
                    {notification.actor?.profilePicUrl ? (
                      <img
                        src={notification.actor.profilePicUrl}
                        alt={actorName}
                      />
                    ) : (
                      actorInitial
                    )}
                  </div>
                  <div className="notification-details">
                    <div className="notification-text">
                      <span className="notification-actor">
                        {actorName}
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
            );
          })}
        </div>

        {notifications.length === 0 && !isLoading && (
          <div className="notifications-empty">[ no notifications yet ]</div>
        )}

        {isLoading && notifications.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "16px", textAlign: "center" }}>
            loading notifications...
          </p>
        )}

        {notifications.length > 0 && hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn"
            style={{ marginTop: "24px", width: "100%", padding: "10px" }}
          >
            {isFetchingNextPage ? "loading more..." : "load more notifications"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Notifications;
