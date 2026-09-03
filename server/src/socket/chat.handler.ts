import { Server as SocketIOServer, Socket } from "socket.io";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import { createMessage } from "../services/message.service";

export const registerChatHandlers = (
  io: SocketIOServer,
  socket: Socket
) => {
  const userId = socket.data.userId;

  // Handle joining a private conversation room with authorization check
  socket.on("conversation:join", async (conversationId: string) => {
    try {
      if (!userId) {
        socket.emit("chat:error", { message: "Unauthorized" });
        return;
      }

      if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
        socket.emit("chat:error", { message: "Invalid conversation ID" });
        return;
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("chat:error", {
          message: "Conversation not found",
        });
        return;
      }

      socket.join(conversationId);
      socket.emit("conversation:joined", { conversationId });
      console.log(`Socket ${socket.id} (user: ${userId}) joined room: ${conversationId}`);
    } catch (error: any) {
      socket.emit("chat:error", {
        message: error.message || "Failed to join conversation",
      });
    }
  });

  // Handle leaving a conversation room
  socket.on("conversation:leave", (conversationId: string) => {
    if (conversationId) {
      socket.leave(conversationId);
      socket.emit("conversation:left", { conversationId });
      console.log(`Socket ${socket.id} left room: ${conversationId}`);
    }
  });

  // Handle sending and persisting a chat message
  socket.on(
    "message:send",
    async (payload: { conversationId: string; content: string }) => {
      try {
        if (!userId) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }

        const { conversationId, content } = payload || {};

        if (!conversationId || !content) {
          socket.emit("chat:error", {
            message: "Conversation ID and content are required",
          });
          return;
        }

        // 1. Authorize sender & persist message to MongoDB
        const message = await createMessage(
          conversationId,
          userId,
          content
        );

        // 2. Emit canonical persisted message to everyone in the conversation room
        io.to(conversationId).emit("message:new", message);
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to send message",
        });
      }
    }
  );
};
