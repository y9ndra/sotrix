import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { config } from "../config/env";
import { authenticateSocket } from "./middleware/authenticate.socket";
import { setSocketIO } from "./socket.manager";

export const initializeSocket = (
  httpServer: HTTPServer
) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  setSocketIO(io);

  io.use(authenticateSocket);

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;

    socket.join(userId);

    console.log(
      `Socket connected: ${socket.id}, user: ${userId}`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}, reason: ${reason}`
      );
    });
  });

  return io;
};
