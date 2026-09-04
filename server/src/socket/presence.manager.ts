/**
 * In-Memory Multi-Socket Presence Manager
 * 
 * Maps each userId to a Set of active socket IDs.
 * A user is ONLINE if they have >= 1 active socket.
 * A user transitions to OFFLINE only when their last socket disconnects.
 */

const onlineUsers = new Map<string, Set<string>>();

/**
 * Adds a socket ID for a given user.
 * Returns true if the user transitioned from OFFLINE -> ONLINE (i.e. first socket).
 */
export const addUserSocket = (userId: string, socketId: string): boolean => {
  let sockets = onlineUsers.get(userId);
  const wasOffline = !sockets || sockets.size === 0;

  if (!sockets) {
    sockets = new Set<string>();
    onlineUsers.set(userId, sockets);
  }

  sockets.add(socketId);
  return wasOffline;
};

/**
 * Removes a socket ID for a given user.
 * Returns true if the user transitioned from ONLINE -> OFFLINE (i.e. last socket removed).
 */
export const removeUserSocket = (userId: string, socketId: string): boolean => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }

  return false;
};

/**
 * Checks if a specific user is currently online
 */
export const isUserOnline = (userId: string): boolean => {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
};

/**
 * Returns an array of all currently online user IDs
 */
export const getOnlineUsers = (): string[] => {
  return Array.from(onlineUsers.keys());
};
