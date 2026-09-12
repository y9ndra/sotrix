import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import IORedis from "ioredis";
import { config, allowedOrigins } from "../config/env";
import { authenticateSocket } from "./middleware/authenticate.socket";
import { setSocketIO } from "./socket.manager";
import { getUserRoom } from "./socketRooms";
import { registerChatHandlers } from "./chat.handler";
import Conversation from "../models/conversation.model";
import {
  addUserSocket,
  removeUserSocket,
  getOnlineUsers,
} from "./presence.manager";
import { logger } from "../config/logger";

let io: SocketIOServer | null = null;

export const initializeSocket = (
  httpServer: HTTPServer
): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        const normalized = requestOrigin.replace(/\/+$/, "");
        if (
          allowedOrigins.includes(normalized) ||
          allowedOrigins.includes("*") ||
          normalized.endsWith(".vercel.app") ||
          normalized.endsWith("yugendhra.me") ||
          process.env.NODE_ENV !== "production"
        ) {
          return callback(null, true);
        }
        return callback(new Error("CORS origin not allowed for socket"));
      },
      credentials: true,
    },
  });

  setSocketIO(io);

  // Setup Redis subscriber for cross-process worker event broadcasting
  if (process.env.NODE_ENV !== "test") {
    try {
      const rawRedisUrl = (process.env.REDIS_URL || "redis://localhost:6379")
        .trim()
        .replace(/^["']|["']$/g, "");

      const redisSub = new IORedis(
        rawRedisUrl,
        {
          maxRetriesPerRequest: 1,
        }
      );

      redisSub.on("error", () => {});

      redisSub.subscribe("socket:emit_to_user", (err) => {
        if (err) {
          logger.warn({ err: err.message }, "Failed to subscribe to socket:emit_to_user channel");
        }
      });

      redisSub.on("message", (channel, message) => {
        if (channel === "socket:emit_to_user" && io) {
          try {
            const { userId, event, data } = JSON.parse(message);
            io.to(userId).to(getUserRoom(userId)).emit(event, data);
          } catch (e) {
            logger.error(e, "Error processing Redis socket message");
          }
        }
      });
    } catch (err) {
      logger.warn(err, "Redis socket subscriber initialization skipped");
    }
  }

  io.use(authenticateSocket);

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;

    socket.join(userId);
    socket.join(getUserRoom(userId));

    logger.info(
      { socketId: socket.id, userId },
      `Socket connected: ${socket.id}, user: ${userId}`
    );

    // Auto-join all conversation rooms the user is a participant of
    if (userId) {
      Conversation.find({ participants: userId })
        .select("_id")
        .lean()
        .then((userConvs) => {
          for (const conv of userConvs) {
            socket.join((conv._id as any).toString());
          }
        })
        .catch((err) => {
          logger.warn(err, "Error auto-joining user conversation rooms");
        });
    }

    // Multi-socket presence tracking
    if (userId) {
      const becameOnline = addUserSocket(userId, socket.id);
      if (becameOnline) {
        io!.emit("presence:online", { userId });
        logger.info({ userId }, `Presence: User ${userId} is now ONLINE`);
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
      socket.emit("test:pong", {
        message: "Hello from Sotrix backend 🚀",
        receivedAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", (reason) => {
      logger.info(
        { socketId: socket.id, reason, userId },
        `Socket disconnected: ${socket.id}, reason: ${reason}`
      );

      if (userId) {
        const becameOffline = removeUserSocket(userId, socket.id);
        if (becameOffline) {
          io!.emit("presence:offline", { userId });
          logger.info({ userId }, `Presence: User ${userId} is now OFFLINE`);
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
