import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { config } from "../config/env";
import { authenticateSocket } from "./middleware/authenticate.socket";

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket: Socket) => {
    console.log(
      `Socket connected: ${socket.id}, user: ${socket.data.userId}`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}, reason: ${reason}`
      );
    });
  });

  return io;
};
