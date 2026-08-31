import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../../config/env";

interface SocketTokenPayload {
  id?: string;
  userId?: string;
}

export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(
      token,
      config.JWT_ACCESS_SECRET
    ) as SocketTokenPayload;

    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return next(new Error("Authentication error: Invalid payload"));
    }

    socket.data.userId = userId.toString();

    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
};
