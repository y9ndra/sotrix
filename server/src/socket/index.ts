import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import IORedis from "ioredis";
import { config } from "../config/env";
import { authenticateSocket } from "./middleware/authenticate.socket";
import { setSocketIO } from "./socket.manager";
import { getUserRoom } from "./socketRooms";
import { registerChatHandlers } from "./chat.handler";
import {
  addUserSocket,
  removeUserSocket,
  getOnlineUsers,
} from "./presence.manager";

let io: SocketIOServer | null = null;

export const initializeSocket = (
  httpServer: HTTPServer
): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  setSocketIO(io);

  // Setup Redis subscriber for cross-process worker event broadcasting
  if (process.env.NODE_ENV !== "test") {
    try {
      const redisSub = new IORedis(
        process.env.REDIS_URL || "redis://localhost:6379",
        {
          maxRetriesPerRequest: 1,
        }
      );

      redisSub.on("error", () => {});

      redisSub.subscribe("socket:emit_to_user", (err) => {
        if (err) {
          console.warn("Failed to subscribe to socket:emit_to_user channel:", err.message);
        }
      });

      redisSub.on("message", (channel, message) => {
        if (channel === "socket:emit_to_user" && io) {
          try {
            const { userId, event, data } = JSON.parse(message);
            io.to(userId).to(getUserRoom(userId)).emit(event, data);
          } catch (e) {
            console.error("Error processing Redis socket message:", e);
          }
        }
      });
    } catch (err) {
      console.warn("Redis socket subscriber initialization skipped:", err);
    }
  }

  io.use(authenticateSocket);

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;

    socket.join(userId);
    socket.join(getUserRoom(userId));

    console.log(
      `Socket connected: ${socket.id}, user: ${userId}`
    );

    console.log(
      `Socket ${socket.id} joined room: ${getUserRoom(userId)}`
    );

    // Multi-socket presence tracking
    if (userId) {
      const becameOnline = addUserSocket(userId, socket.id);
      if (becameOnline) {
        io!.emit("presence:online", { userId });
        console.log(`Presence: User ${userId} is now ONLINE`);
      }

      // Send initial online users list to connecting socket
      socket.emit("presence:list", {
        users: getOnlineUsers(),
      });
    }

    // Allow clients to request fresh presence list on demand
    socket.on("presence:get", () => {
      socket.emit("presence:list", {
        users: getOnlineUsers(),
      });
    });

    // Register chat handlers (rooms, messaging)
    registerChatHandlers(io!, socket);

    socket.on("test:ping", (data) => {
      console.log("Received ping from client:", data);

      socket.emit("test:pong", {
        message: "Hello from Sotrix backend 🚀",
        receivedAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}, reason: ${reason}`
      );

      if (userId) {
        const becameOffline = removeUserSocket(userId, socket.id);
        if (becameOffline) {
          io!.emit("presence:offline", { userId });
          console.log(`Presence: User ${userId} is now OFFLINE`);
        }
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};
