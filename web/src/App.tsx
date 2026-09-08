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

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
        console.log("Connected to Socket.IO server:", socket.id, "as user:", user._id || (user as any).id);

        // Fetch current online users presence list immediately
        socket.emit("presence:get");

        socket.emit("test:ping", {
          message: "Hello from frontend 👋",
        });
      });

      // Global Presence event listeners
      const handlePresenceList = (data: { users: string[] }) => {
        console.log("🟢 Received presence:list:", data?.users);
        usePresenceStore.getState().setOnlineUsers(data?.users || []);
      };

      const handlePresenceOnline = ({ userId }: { userId: string }) => {
        console.log("🟢 User came online:", userId);
        usePresenceStore.getState().addUser(userId);
      };

      const handlePresenceOffline = ({ userId }: { userId: string }) => {
        console.log("⚪ User went offline:", userId);
        usePresenceStore.getState().removeUser(userId);
      };

      socket.on("presence:list", handlePresenceList);
      socket.on("presence:online", handlePresenceOnline);
      socket.on("presence:offline", handlePresenceOffline);

      socket.on("test:pong", (data) => {
        console.log("Received pong from backend:", data);
      });

      socket.on("notification:new", (notification: Notification) => {
        console.log(
          "🔔 New real-time notification received:",
          notification
        );
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
        // Optimistically update conversation message cache if loaded
        queryClient.setQueryData<MessagesResponse>(
          queryKeys.conversations.messages(newMsg.conversation),
          (oldData) => {
            if (!oldData) {
              return {
                success: true,
                data: [newMsg],
                nextCursor: null,
                hasMore: false,
              };
            }
            if (oldData.data.some((m) => m._id === newMsg._id)) {
              return oldData;
            }
            return {
              ...oldData,
              data: [newMsg, ...oldData.data],
            };
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
            const isSentByMe = senderId === currentUserId;

            return old
              .map((conv) => {
                if (conv._id === newMsg.conversation) {
                  return {
                    ...conv,
                    updatedAt: newMsg.createdAt,
                    lastMessage: {
                      content: newMsg.content,
                      sender: newMsg.sender,
                      createdAt: newMsg.createdAt,
                    },
                    hasUnread: isSentByMe ? false : true,
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

      socket.on("message:new", handleGlobalMessageNew);

      socket.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
      });

      return () => {
        socket.off("connect");
        socket.off("test:pong");
        socket.off("presence:list", handlePresenceList);
        socket.off("presence:online", handlePresenceOnline);
        socket.off("presence:offline", handlePresenceOffline);
        socket.off("notification:new");
        socket.off("message:new", handleGlobalMessageNew);
        socket.off("disconnect");
        disconnectSocket();
      };
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?._id, (user as any)?.id, addNotification, queryClient]);

  return (
    <>
      <RubiksCursor />
      <AuthInitializer />
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
