import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { config } from "../config/env";

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  return io;
};
