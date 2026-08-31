import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

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
  const socketIO = getSocketIO();

  socketIO.to(userId).emit(event, data);
};
