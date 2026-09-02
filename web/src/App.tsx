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
import DeckLayout from './components/DeckLayout';

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket, disconnectSocket } from "./services/socket.service";
import { useNotificationStore } from "./store/notification.store";
import { queryKeys } from "./lib/queryKeys";
import type { Notification } from "./types/notification.types";

import { useAuthStore } from "./store/authStore";

function App() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();

    if (socket) {
      socket.on("connect", () => {
        console.log("Connected to Socket.IO server:", socket.id, "as user:", user._id || (user as any).id);

        socket.emit("test:ping", {
          message: "Hello from frontend 👋",
        });
      });

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

      socket.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
      });
    }

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("test:pong");
        socket.off("notification:new");
        socket.off("disconnect");
      }

      disconnectSocket();
    };
  }, [isAuthenticated, user?._id, (user as any)?.id, addNotification, queryClient]);

  return (
    <>
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
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
