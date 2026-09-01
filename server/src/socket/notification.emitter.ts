import { emitToUser } from "./socket.manager";
import { getUserRoom } from "./socketRooms";
import { getIO } from "./index";

export const emitNotification = (
  userId: string,
  notification: any
): void => {
  emitToUser(userId, "notification:new", notification);
};
