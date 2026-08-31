import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../../config/env";

interface SocketTokenPayload {
  id: string;
}

export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(
      token,
      config.JWT_ACCESS_SECRET
    ) as SocketTokenPayload;

    socket.data.userId = decoded.id;

    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
};
