import { Server as SocketIOServer, Socket } from "socket.io";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import { createMessage } from "../services/message.service";
import { getUserRoom } from "./socketRooms";

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

        // 2. Fetch conversation participants to broadcast to their individual user rooms
        const conversation = await Conversation.findById(conversationId).select("participants");
        const participantIds = conversation?.participants || [];

        // Broadcast to conversation room AND each participant's personal room
        // Socket.IO deduplicates targets across chained rooms automatically
        let emitter: any = io.to(conversationId);
        for (const pId of participantIds) {
          const pIdStr = pId.toString();
          emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
        }
        emitter.emit("message:new", message);
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to send message",
        });
      }
    }
  );

  // Handle typing:start event (broadcast to others in room)
  socket.on(
    "typing:start",
    async (payload: { conversationId: string }) => {
      try {
        if (!userId) return;

        const { conversationId } = payload || {};
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          return;
        }

        // Verify conversation membership
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return;
        }

        // Broadcast only to OTHER participants in the conversation room
        socket.to(conversationId).emit("typing:start", {
          conversationId,
          userId,
        });
      } catch (error) {
        console.error("Error handling typing:start event:", error);
      }
    }
  );

  // Handle typing:stop event (broadcast to others in room)
  socket.on(
    "typing:stop",
    async (payload: { conversationId: string }) => {
      try {
        if (!userId) return;

        const { conversationId } = payload || {};
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          return;
        }

        // Verify conversation membership
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return;
        }

        // Broadcast only to OTHER participants in the conversation room
        socket.to(conversationId).emit("typing:stop", {
          conversationId,
          userId,
        });
      } catch (error) {
        console.error("Error handling typing:stop event:", error);
      }
    }
  );
};
