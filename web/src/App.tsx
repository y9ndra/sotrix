import { Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Search from './pages/Search';
import ProtectedRoute from './components/ProtectedRoute';
import AuthInitializer from './components/AuthInitializer';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import DeckLayout from './components/DeckLayout';
import RubiksCursor from './components/RubiksCursor';
import GlobalLoader from './components/GlobalLoader';
import DemoRestrictedModal from './components/DemoRestrictedModal';

import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { connectSocket, disconnectSocket } from "./services/socket.service";
import { useNotificationStore } from "./store/notification.store";
import { usePresenceStore } from "./store/presenceStore";
import { queryKeys } from "./lib/queryKeys";
import type { Notification } from "./types/notification.types";
import type { ChatMessage, MessagesResponse, Conversation } from "./types/chat.types";

import { useAuthStore } from "./store/authStore";

function App() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      usePresenceStore.getState().clearPresence();
      return;
    }

    const socket = connectSocket();

    if (socket) {
      socket.on("connect", () => {
        if (import.meta.env.DEV) {
          console.log("Connected to Socket.IO server:", socket.id, "as user:", user._id || (user as any).id);
        }

        // Fetch current online users presence list immediately
        socket.emit("presence:get");

        socket.emit("test:ping", {
          message: "Hello from frontend 👋",
        });
      });

      // Global Presence event listeners
      const handlePresenceList = (data: { users: string[] }) => {
        if (import.meta.env.DEV) {
          console.log("🟢 Received presence:list:", data?.users);
        }
        usePresenceStore.getState().setOnlineUsers(data?.users || []);
      };

      const handlePresenceOnline = ({ userId }: { userId: string }) => {
        if (import.meta.env.DEV) {
          console.log("🟢 User came online:", userId);
        }
        usePresenceStore.getState().addUser(userId);
      };

      const handlePresenceOffline = ({ userId }: { userId: string }) => {
        if (import.meta.env.DEV) {
          console.log("⚪ User went offline:", userId);
        }
        usePresenceStore.getState().removeUser(userId);
      };

      socket.on("presence:list", handlePresenceList);
      socket.on("presence:online", handlePresenceOnline);
      socket.on("presence:offline", handlePresenceOffline);

      socket.on("test:pong", (data) => {
        if (import.meta.env.DEV) {
          console.log("Received pong from backend:", data);
        }
      });

      socket.on("notification:new", (notification: Notification) => {
        if (import.meta.env.DEV) {
          console.log(
            "🔔 New real-time notification received:",
            notification
          );
        }
        addNotification(notification);

        // Optimistically prepend to TanStack infinite cache
        queryClient.setQueryData<any>(
          queryKeys.notifications.all,
          (oldData: any) => {
            if (!oldData || !oldData.pages) {
              return {
                pages: [
                  {
                    success: true,
                    data: [notification],
                    pagination: { hasMore: false, nextCursor: null },
                  },
                ],
                pageParams: [undefined],
              };
            }

            const exists = oldData.pages.some((page: any) =>
              page.data?.some((n: any) => n._id === notification._id)
            );
            if (exists) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page: any, idx: number) => {
                if (idx === 0) {
                  return {
                    ...page,
                    data: [notification, ...(page.data || [])],
                  };
                }
                return page;
              }),
            };
          }
        );

        // Optimistically update unread count cache
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          (old: any) => ({
            success: true,
            data: {
              unreadCount: (old?.data?.unreadCount ?? 0) + 1,
            },
          })
        );

        queryClient.refetchQueries({ queryKey: queryKeys.notifications.all });
        queryClient.refetchQueries({ queryKey: queryKeys.notifications.unreadCount });
      });

      const handleGlobalMessageNew = (newMsg: ChatMessage) => {
        // If user is currently on the Messages page, Messages.tsx manages active chat,
        // message cache, audio chimes, and conversation list updates without double-counting
        if (window.location.pathname.startsWith("/messages")) {
          return;
        }

        // Optimistically update conversation message cache if loaded
        queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
          queryKeys.conversations.messages(newMsg.conversation),
          (oldData) => {
            if (!oldData) {
              return {
                pages: [
                  {
                    success: true,
                    data: [newMsg],
                    nextCursor: null,
                    hasMore: false,
                  },
                ],
                pageParams: [undefined],
              };
            }

            // Check if it's in InfiniteData format
            if ("pages" in oldData) {
              const alreadyExists = oldData.pages.some((page) =>
                page?.data?.some((m) => m._id === newMsg._id)
              );
              if (alreadyExists) return oldData;

              const firstPage = oldData.pages[0] || {
                success: true,
                data: [],
                nextCursor: null,
                hasMore: false,
              };
              const updatedFirstPage = {
                ...firstPage,
                data: [newMsg, ...(firstPage.data || [])],
              };
              return {
                ...oldData,
                pages: [updatedFirstPage, ...oldData.pages.slice(1)],
              };
            }

            // Fallback for single MessagesResponse format
            if ("data" in oldData && Array.isArray(oldData.data)) {
              if (oldData.data.some((m) => m._id === newMsg._id)) {
                return oldData;
              }
              return {
                ...oldData,
                data: [newMsg, ...oldData.data],
              };
            }

            return oldData;
          }
        );

        // Optimistically update conversations list cache: bump to top and mark hasUnread
        queryClient.setQueryData<Conversation[]>(
          queryKeys.conversations.all,
          (old = []) => {
            const currentUserId = user?._id || (user as any)?.id;
            const senderId =
              typeof newMsg.sender === "string"
                ? newMsg.sender
                : newMsg.sender?._id || (newMsg.sender as any)?.id;
            const exists = old.some((conv) => conv._id === newMsg.conversation);
            if (!exists) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
              });
              return old;
            }

            const isSentByMe = senderId === currentUserId;

            return old
              .map((conv) => {
                if (conv._id === newMsg.conversation) {
                  // Prevent duplicate processing if already updated
                  if (
                    conv.lastMessage &&
                    conv.lastMessage.createdAt === newMsg.createdAt &&
                    conv.lastMessage.content === newMsg.content
                  ) {
                    return conv;
                  }

                  return {
                    ...conv,
                    updatedAt: newMsg.createdAt,
                    lastMessage: {
                      content: newMsg.content,
                      sender: newMsg.sender,
                      createdAt: newMsg.createdAt,
                    },
                    hasUnread: isSentByMe ? false : true,
                    unreadCount: isSentByMe ? 0 : ((conv.unreadCount || 0) + 1),
                  };
                }
                return conv;
              })
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
          }
        );

        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(newMsg.conversation),
        });
      };

      const handleGlobalConversationNew = (newConv: Conversation) => {
        console.log("💬 Real-time conversation:new received:", newConv?._id);
        queryClient.setQueryData<Conversation[]>(
          queryKeys.conversations.all,
          (old = []) => {
            if (old.some((c) => c._id === newConv._id)) {
              return old;
            }
            return [newConv, ...old];
          }
        );
        queryClient.setQueryData(
          queryKeys.conversations.detail(newConv._id),
          newConv
        );
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.all,
        });
      };

      const handleGlobalConversationRead = ({
        conversationId,
        readerId,
        readAt,
      }: {
        conversationId: string;
        readerId: string;
        readAt?: string | Date;
      }) => {
        if (window.location.pathname.startsWith("/messages")) {
          return;
        }

        const currentUserId = user?._id || (user as any)?.id;
        if (readerId === currentUserId) {
          queryClient.setQueryData<Conversation[]>(
            queryKeys.conversations.all,
            (old = []) =>
              old.map((c) =>
                c._id === conversationId ? { ...c, hasUnread: false, unreadCount: 0 } : c
              )
          );
        } else {
          queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
            queryKeys.conversations.messages(conversationId),
            (oldData) => {
              if (!oldData) return oldData;
              const markMsgRead = (m: ChatMessage) => {
                const sId =
                  typeof m.sender === "string"
                    ? m.sender
                    : m.sender?._id || (m.sender as any)?.id;
                if (sId === currentUserId && !m.isRead) {
                  return {
                    ...m,
                    isRead: true,
                    readAt:
                      typeof readAt === "string"
                        ? readAt
                        : readAt
                        ? new Date(readAt).toISOString()
                        : new Date().toISOString(),
                  };
                }
                return m;
              };

              if ("pages" in oldData) {
                return {
                  ...oldData,
                  pages: oldData.pages.map((page) => ({
                    ...page,
                    data: page.data.map(markMsgRead),
                  })),
                };
              }
              if ("data" in oldData && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: oldData.data.map(markMsgRead),
                };
              }
              return oldData;
            }
          );
        }
      };

      const handleGlobalMessageDeleted = ({
        conversationId,
        messageId,
        mode,
        isDeleted,
        lastMessage,
      }: {
        conversationId: string;
        messageId: string;
        mode?: string;
        isDeleted?: boolean;
        lastMessage?: any;
      }) => {
        if (window.location.pathname.startsWith("/messages")) {
          return;
        }

        const isSoftDelete = mode === "for_everyone" || isDeleted;

        queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
          queryKeys.conversations.messages(conversationId),
          (oldData) => {
            if (!oldData) return oldData;
            if ("pages" in oldData) {
              return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  data: isSoftDelete
                    ? page.data.map((m) =>
                        m._id === messageId
                          ? { ...m, isDeleted: true, content: "This message was deleted" }
                          : m
                      )
                    : page.data.filter((m) => m._id !== messageId),
                })),
              };
            }
            if ("data" in oldData && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: isSoftDelete
                  ? oldData.data.map((m) =>
                      m._id === messageId
                        ? { ...m, isDeleted: true, content: "This message was deleted" }
                        : m
                    )
                  : oldData.data.filter((m) => m._id !== messageId),
              };
            }
            return oldData;
          }
        );

        queryClient.setQueryData<Conversation[]>(
          queryKeys.conversations.all,
          (old = []) =>
            old.map((c) => {
              if (c._id === conversationId) {
                return {
                  ...c,
                  lastMessage: lastMessage || undefined,
                };
              }
              return c;
            })
        );
      };

      const handleGlobalMessageBatchDeleted = ({
        conversationId,
        messageIds,
        mode,
        isDeleted,
        lastMessage,
      }: {
        conversationId: string;
        messageIds: string[];
        mode?: string;
        isDeleted?: boolean;
        lastMessage?: any;
      }) => {
        if (window.location.pathname.startsWith("/messages")) {
          return;
        }
        const idSet = new Set(messageIds);
        const isSoftDelete = mode === "for_everyone" || isDeleted;

        queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
          queryKeys.conversations.messages(conversationId),
          (oldData) => {
            if (!oldData) return oldData;
            if ("pages" in oldData) {
              return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  data: isSoftDelete
                    ? page.data.map((m) =>
                        idSet.has(m._id)
                          ? { ...m, isDeleted: true, content: "This message was deleted" }
                          : m
                      )
                    : page.data.filter((m) => !idSet.has(m._id)),
                })),
              };
            }
            if ("data" in oldData && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: isSoftDelete
                  ? oldData.data.map((m) =>
                      idSet.has(m._id)
                        ? { ...m, isDeleted: true, content: "This message was deleted" }
                        : m
                    )
                  : oldData.data.filter((m) => !idSet.has(m._id)),
              };
            }
            return oldData;
          }
        );

        queryClient.setQueryData<Conversation[]>(
          queryKeys.conversations.all,
          (old = []) =>
            old.map((c) => {
              if (c._id === conversationId) {
                return {
                  ...c,
                  lastMessage: lastMessage || undefined,
                };
              }
              return c;
            })
        );
      };

      socket.on("message:new", handleGlobalMessageNew);
      socket.on("conversation:new", handleGlobalConversationNew);
      socket.on("conversation:read", handleGlobalConversationRead);
      socket.on("message:deleted", handleGlobalMessageDeleted);
      socket.on("message:batch-deleted", handleGlobalMessageBatchDeleted);

      socket.on("disconnect", () => {
        if (import.meta.env.DEV) {
          console.log("Disconnected from Socket.IO server");
        }
      });

      return () => {
        socket.off("connect");
        socket.off("test:pong");
        socket.off("presence:list", handlePresenceList);
        socket.off("presence:online", handlePresenceOnline);
        socket.off("presence:offline", handlePresenceOffline);
        socket.off("notification:new");
        socket.off("message:new", handleGlobalMessageNew);
        socket.off("conversation:new", handleGlobalConversationNew);
        socket.off("conversation:read", handleGlobalConversationRead);
        socket.off("message:deleted", handleGlobalMessageDeleted);
        socket.off("message:batch-deleted", handleGlobalMessageBatchDeleted);
        socket.off("disconnect");
        disconnectSocket();
      };
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, addNotification, queryClient]);

  return (
    <>
      <RubiksCursor />
      <AuthInitializer />
      <GlobalLoader />
      <DemoRestrictedModal />
      <Routes>
        {/* Unprotected Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Layered Deck Workspace Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DeckLayout />
            </ProtectedRoute>
          }
        >
          {/* Base Layer Home timeline route */}
          <Route path="/" element={<></>} />

          {/* Sliding Sheet Panel sub-routes */}
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/chat" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
