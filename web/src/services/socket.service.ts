import { io, Socket } from "socket.io-client";
import { getToken } from "./token.service";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const connectSocket = (): Socket | null => {
  const token = getToken();

  if (!token) {
    return null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: {
        token,
      },
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
