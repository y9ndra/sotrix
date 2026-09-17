import { io, Socket } from "socket.io-client";
import { getToken } from "./token.service";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const connectSocket = (): Socket | null => {
  const token = getToken();

  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // If socket is already actively connected, reuse it
  if (socket?.connected) {
    return socket;
  }

  // If socket already exists but disconnected, disconnect and recreate
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    auth: (cb) => {
      cb({ token: getToken() });
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect_error", async (err) => {
    console.warn("[SOCKET connect_error]:", err.message);
    if (
      err.message?.includes("Authentication") ||
      err.message?.includes("jwt") ||
      err.message?.includes("token")
    ) {
      try {
        const { refreshSession } = await import("../api/axios");
        const newToken = await refreshSession();
        if (newToken && socket) {
          socket.auth = { token: newToken };
          socket.connect();
        }
      } catch (e) {
        console.error("Failed to auto-refresh session for socket:", e);
      }
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  if (!socket || !socket.connected) {
    const token = getToken();
    if (token) {
      return connectSocket();
    }
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
