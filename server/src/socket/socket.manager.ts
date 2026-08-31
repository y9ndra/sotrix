import { Server as SocketIOServer } from "socket.io";
import IORedis from "ioredis";

let io: SocketIOServer | null = null;
let redisPub: IORedis | null = null;

const getRedisPub = (): IORedis | null => {
  if (!redisPub && process.env.NODE_ENV !== "test") {
    try {
      redisPub = new IORedis(
        process.env.REDIS_URL || "redis://localhost:6379",
        {
          maxRetriesPerRequest: 1,
          lazyConnect: false,
        }
      );
      redisPub.on("error", () => {});
    } catch {
      redisPub = null;
    }
  }
  return redisPub;
};

export const setSocketIO = (
  socketIO: SocketIOServer
): void => {
  io = socketIO;
};

export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

export const emitToUser = (
  userId: string,
  event: string,
  data: unknown
): void => {
  if (io) {
    io.to(userId).emit(event, data);
  } else {
    const pub = getRedisPub();
    if (pub) {
      pub
        .publish(
          "socket:emit_to_user",
          JSON.stringify({ userId, event, data })
        )
        .catch((err) => {
          console.error("Redis pub error in emitToUser:", err);
        });
    }
  }
};
