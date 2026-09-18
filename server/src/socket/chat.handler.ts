import { Server as SocketIOServer, Socket } from "socket.io";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import {
  createMessage,
  editMessage,
  deleteMessage,
  batchDeleteMessages,
  DeleteMessageMode,
} from "../services/message.service";
import { markConversationAsRead } from "../services/conversation.service";
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

  // Handle marking conversation as read explicitly
  socket.on(
    "conversation:read",
    async (payload: { conversationId: string }) => {
      try {
        if (!userId) return;
        const { conversationId } = payload || {};
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
          return;
        }
        await markConversationAsRead(conversationId, userId);
        const conversation = await Conversation.findById(conversationId).select("participants");
        const participantIds = conversation?.participants || [];
        let emitter: any = io.to(conversationId);
        for (const pId of participantIds) {
          const pIdStr = pId.toString();
          emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
        }
        emitter.emit("conversation:read", {
          conversationId,
          readerId: userId,
          readAt: new Date(),
        });
      } catch (error) {
        console.error("Error handling conversation:read event:", error);
      }
    }
  );

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
    async (payload: {
      conversationId: string;
      content: string;
      replyToId?: string;
    }) => {
      try {
        if (!userId) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }

        const { conversationId, content, replyToId } = payload || {};

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
          content,
          replyToId
        );

        // 2. Fetch conversation participants to broadcast to their individual user rooms
        const conversation = await Conversation.findById(conversationId).select("participants");
        const participantIds = conversation?.participants || [];

        // Broadcast to conversation room AND each participant's personal room
        let emitter: any = io.to(conversationId);
        for (const pId of participantIds) {
          const pIdStr = pId.toString();
          emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
        }
        emitter.emit("message:new", message);

        // Also emit directly to the sender's current socket for immediate UI response
        socket.emit("message:new", message);
      } catch (error: any) {
        console.error("[SOCKET message:send ERROR]:", error);
        socket.emit("chat:error", {
          message: error.message || "Failed to send message",
        });
      }
    }
  );

  // Handle editing a chat message
  socket.on(
    "message:edit",
    async (payload: {
      conversationId: string;
      messageId: string;
      content: string;
    }) => {
      try {
        if (!userId) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }

        const { conversationId, messageId, content } = payload || {};
        if (!messageId || !content) {
          socket.emit("chat:error", {
            message: "Message ID and content are required",
          });
          return;
        }

        const updatedMessage = await editMessage(messageId, userId, content);

        const targetConvId =
          conversationId || updatedMessage.conversation.toString();
        const conversation = await Conversation.findById(targetConvId).select(
          "participants"
        );
        const participantIds = conversation?.participants || [];

        let emitter: any = io.to(targetConvId);
        for (const pId of participantIds) {
          const pIdStr = pId.toString();
          emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
        }
        emitter.emit("message:edited", updatedMessage);
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to edit message",
        });
      }
    }
  );

  // Handle deleting a chat message (selective: for_me or for_everyone)
  socket.on(
    "message:delete",
    async (payload: {
      conversationId: string;
      messageId: string;
      mode?: DeleteMessageMode;
    }) => {
      try {
        if (!userId) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }

        const { conversationId, messageId, mode = "for_everyone" } = payload || {};
        if (!messageId) {
          socket.emit("chat:error", {
            message: "Message ID is required",
          });
          return;
        }

        const result = await deleteMessage(messageId, userId, mode);

        const targetConvId = conversationId || result.conversationId;

        if (result.mode === "for_everyone") {
          const conversation = await Conversation.findById(targetConvId).select(
            "participants"
          );
          const participantIds = conversation?.participants || [];

          let emitter: any = io.to(targetConvId);
          for (const pId of participantIds) {
            const pIdStr = pId.toString();
            emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
          }
          emitter.emit("message:deleted", {
            conversationId: targetConvId,
            messageId: result.messageId,
            mode: "for_everyone",
            isDeleted: true,
            lastMessage: result.lastMessage,
          });
        } else {
          // for_me: only emit to requesting user's room
          io.to(userId.toString())
            .to(getUserRoom(userId.toString()))
            .emit("message:deleted", {
              conversationId: targetConvId,
              messageId: result.messageId,
              mode: "for_me",
              lastMessage: result.lastMessage,
            });
        }
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to delete message",
        });
      }
    }
  );

  // Handle batch deleting chat messages (selective: for_me or for_everyone)
  socket.on(
    "message:batch-delete",
    async (payload: {
      conversationId: string;
      messageIds: string[];
      mode?: DeleteMessageMode;
    }) => {
      try {
        if (!userId) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }

        const { conversationId, messageIds, mode = "for_everyone" } = payload || {};
        if (
          !conversationId ||
          !messageIds ||
          !Array.isArray(messageIds) ||
          messageIds.length === 0
        ) {
          socket.emit("chat:error", {
            message: "Conversation ID and messageIds array are required",
          });
          return;
        }

        const result = await batchDeleteMessages(
          messageIds,
          userId,
          mode
        );

        const targetConvId = conversationId || result.conversationId;

        if (result.mode === "for_everyone") {
          const conversation = await Conversation.findById(targetConvId).select(
            "participants"
          );
          const participantIds = conversation?.participants || [];

          let emitter: any = io.to(targetConvId);
          for (const pId of participantIds) {
            const pIdStr = pId.toString();
            emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
          }
          emitter.emit("message:batch-deleted", {
            conversationId: targetConvId,
            messageIds: result.messageIds,
            mode: "for_everyone",
            isDeleted: true,
            lastMessage: result.lastMessage,
          });
        } else {
          // for_me: only emit to requesting user's room
          io.to(userId.toString())
            .to(getUserRoom(userId.toString()))
            .emit("message:batch-deleted", {
              conversationId: targetConvId,
              messageIds: result.messageIds,
              mode: "for_me",
              lastMessage: result.lastMessage,
            });
        }
      } catch (error: any) {
        socket.emit("chat:error", {
          message: error.message || "Failed to batch delete messages",
        });
      }
    }
  );

  // Handle typing:start event (broadcast to conversation room and peer user rooms)
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

        // Broadcast to conversation room AND each other participant's personal room
        const participantIds = conversation.participants || [];
        let emitter: any = socket.to(conversationId);
        for (const pId of participantIds) {
          const pIdStr = pId.toString();
          if (pIdStr !== userId) {
            emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
          }
        }
        emitter.emit("typing:start", {
          conversationId,
          userId,
        });
      } catch (error) {
        console.error("Error handling typing:start event:", error);
      }
    }
  );

  // Handle typing:stop event (broadcast to conversation room and peer user rooms)
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

        // Broadcast to conversation room AND each other participant's personal room
        const participantIds = conversation.participants || [];
        let emitter: any = socket.to(conversationId);
        for (const pId of participantIds) {
          const pIdStr = pId.toString();
          if (pIdStr !== userId) {
            emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
          }
        }
        emitter.emit("typing:stop", {
          conversationId,
          userId,
        });
      } catch (error) {
        console.error("Error handling typing:stop event:", error);
      }
    }
  );
};
