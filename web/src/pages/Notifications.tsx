import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import {
  getNotifications,
  markAsRead,
} from "../services/notification.service";
import type { Notification, NotificationPost } from "../types/notification";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../store/notification.store";
import { useAuthStore } from "../store/authStore";
import RubiksLoader from "../components/RubiksLoader";

const LikeIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const CommentIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
  </svg>
);

const FollowIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const formatNotificationTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) {
    return date.toLocaleDateString();
  }

  if (diffInSeconds < 60) {
    return "just now";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const getPostObject = (post: Notification["post"]): NotificationPost | null => {
  if (post && typeof post === "object" && "_id" in post) {
    return post as NotificationPost;
  }
  return null;
};

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id || (currentUser as any)?.id || currentUser?.username;

  const storeNotifications = useNotificationStore((state) => state.notifications);
  const storeMarkAsRead = useNotificationStore((state) => state.markAsRead);
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

  const getNotificationDestination = (notification: Notification): string | null => {
    switch (notification.type) {
      case "follow":
        return notification.actor
          ? `/profile/${notification.actor._id || (notification.actor as any).id || notification.actor.username}`
          : null;
      case "like":
      case "comment":
        if (currentUserId) {
          return `/profile/${currentUserId}`;
        }
        if (notification.actor) {
          return `/profile/${notification.actor._id || (notification.actor as any).id || notification.actor.username}`;
        }
        return null;
      default:
        return null;
    }
  };

  const handleActorClick = (
    e: React.MouseEvent | React.KeyboardEvent,
    notification: Notification
  ) => {
    e.stopPropagation();
    if (!notification.read) {
      markReadMutation.mutate(notification._id);
    }

    if (notification.actor) {
      navigate(`/profile/${notification.actor._id || (notification.actor as any).id || notification.actor.username}`);
    }
  };

  const handleCardClick = (notification: Notification) => {
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

  return (
    <div>
      <div className="notifications-container">
        {error && <p style={{ color: "#ef4444", marginBottom: "16px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>Failed to load notifications</p>}

        <div className="notifications-list">
          {notifications.map((notification: Notification) => {
            const actorName =
              notification.actor?.name?.trim() ||
              notification.actor?.username ||
              "someone";
            const actorInitial = actorName.charAt(0).toUpperCase();
            const postObj = getPostObject(notification.post);

            return (
              <div
                key={notification._id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(notification);
                  }
                }}
                className={`notification-item ${notification.read ? "read" : "unread"}`}
              >
                <div className="notification-content">
                  <div className="notification-avatar-container">
                    <div
                      className="notification-avatar"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleActorClick(e, notification)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleActorClick(e, notification);
                        }
                      }}
                    >
                      {notification.actor?.profilePicUrl ? (
                        <img
                          src={notification.actor.profilePicUrl}
                          alt={actorName}
                        />
                      ) : (
                        actorInitial
                      )}
                    </div>
                    <div
                      className={`notification-type-badge badge-${notification.type}`}
                      title={notification.type}
                    >
                      {notification.type === "like" && <LikeIcon />}
                      {notification.type === "comment" && <CommentIcon />}
                      {notification.type === "follow" && <FollowIcon />}
                    </div>
                  </div>

                  <div className="notification-details">
                    <div className="notification-text">
                      <span
                        className="notification-actor"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleActorClick(e, notification)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleActorClick(e, notification);
                          }
                        }}
                      >
                        {actorName}
                      </span>{" "}
                      <span className="notification-action-text">
                        {getActionText(notification.type)}
                      </span>
                    </div>

                    {postObj?.content && (
                      <div className="notification-post-snippet" title={postObj.content}>
                        “{postObj.content}”
                      </div>
                    )}

                    <span className="notification-time">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="notification-right">
                  {postObj?.imageUrl && (
                    <div className="notification-thumbnail-wrapper">
                      <img
                        src={postObj.imageUrl}
                        alt="Post thumbnail"
                        className="notification-post-thumbnail"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {!notification.read && (
                    <div className="notification-status">
                      <div className="notification-dot" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {notifications.length === 0 && !isLoading && (
          <div className="notifications-empty">[ no notifications yet ]</div>
        )}

        {isLoading && notifications.length === 0 && (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <RubiksLoader size="sm" text="LOADING NOTIFICATIONS" />
          </div>
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
