import { Request, Response, NextFunction } from "express";
import {
  getOrCreateConversation,
  getUserConversations as getUserConversationsService,
  getConversationForUser,
  markConversationAsRead,
} from "../services/conversation.service";
import {
  getMessages as getMessagesService,
  editMessage as editMessageService,
  deleteMessage as deleteMessageService,
  batchDeleteMessages as batchDeleteMessagesService,
  type DeleteMessageMode,
} from "../services/message.service";
import { getSocketIO } from "../socket/socket.manager";
import { getUserRoom } from "../socket/socketRooms";
import Conversation from "../models/conversation.model";

export const createOrGetConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const participantId =
      req.body.participantId || req.body.userId || req.body.recipientId;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "Participant user ID is required",
      });
    }

    const conversation = await getOrCreateConversation(userId, participantId);

    // Broadcast new conversation to online participants and auto-join their active sockets
    try {
      const io = getSocketIO();
      const convIdStr = (conversation._id || conversation.id).toString();
      const u1Str = userId.toString();
      const u2Str = participantId.toString();

      // Auto-join active sockets of both users to conversation room
      io.in(u1Str).in(getUserRoom(u1Str)).in(u2Str).in(getUserRoom(u2Str)).socketsJoin(convIdStr);

      // Emit conversation:new event to both participants
      io.to(u1Str).to(getUserRoom(u1Str)).to(u2Str).to(getUserRoom(u2Str)).emit("conversation:new", conversation);
    } catch (socketErr) {
      console.warn("Could not broadcast conversation:new event:", socketErr);
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversations = await getUserConversationsService(userId);

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const conversation = await getConversationForUser(id, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const cursor = (req.query.cursor as string) || undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await getMessagesService(id, userId, cursor, limit);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const conversation = await markConversationAsRead(id, userId);

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const editMessageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { conversationId, messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty",
      });
    }

    const updatedMessage = await editMessageService(
      messageId,
      userId,
      content
    );

    // Broadcast message:edited to conversation room and participants' user rooms
    try {
      const io = getSocketIO();
      const targetConvId = conversationId || updatedMessage.conversation.toString();
      const conversation = await Conversation.findById(targetConvId).select("participants");
      const participantIds = conversation?.participants || [];

      let emitter: any = io.to(targetConvId);
      for (const pId of participantIds) {
        const pIdStr = pId.toString();
        emitter = emitter.to(pIdStr).to(getUserRoom(pIdStr));
      }
      emitter.emit("message:edited", updatedMessage);
    } catch (socketErr) {
      console.warn("Could not broadcast message:edited event:", socketErr);
    }

    return res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error: any) {
    if (error.message === "Message not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "You are not authorized to edit this message") {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const deleteMessageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { conversationId, messageId } = req.params;
    const mode =
      (req.query.mode as DeleteMessageMode) ||
      (req.body?.mode as DeleteMessageMode) ||
      "for_everyone";

    const result = await deleteMessageService(messageId, userId, mode);

    // Broadcast message:deleted event
    try {
      const io = getSocketIO();
      const targetConvId = conversationId || result.conversationId;

      if (result.mode === "for_everyone") {
        // Broadcast to conversation room and each participant's personal room
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
        });
      } else {
        // "for_me": Only emit to requesting user's personal room across all their active tabs
        io.to(userId.toString())
          .to(getUserRoom(userId.toString()))
          .emit("message:deleted", {
            conversationId: targetConvId,
            messageId: result.messageId,
            mode: "for_me",
          });
      }
    } catch (socketErr) {
      console.warn("Could not broadcast message:deleted event:", socketErr);
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message === "Message not found") {
      return res.status(200).json({
        success: true,
        data: {
          conversationId: req.params.conversationId,
          messageId: req.params.messageId,
          mode: req.query.mode || req.body?.mode || "for_everyone",
        },
      });
    }
    if (
      error.message?.includes("not authorized") ||
      error.message?.includes("access denied")
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const batchDeleteMessagesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    const { messageIds, mode = "for_everyone" } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "messageIds must be a non-empty array of IDs",
      });
    }

    const result = await batchDeleteMessagesService(
      messageIds,
      userId,
      mode as DeleteMessageMode
    );

    // Broadcast batch deletion event
    try {
      const io = getSocketIO();
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
        });
      } else {
        io.to(userId.toString())
          .to(getUserRoom(userId.toString()))
          .emit("message:batch-deleted", {
            conversationId: targetConvId,
            messageIds: result.messageIds,
            mode: "for_me",
          });
      }
    } catch (socketErr) {
      console.warn("Could not broadcast message:batch-deleted event:", socketErr);
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (
      error.message?.includes("not authorized") ||
      error.message?.includes("access denied") ||
      error.message?.includes("only delete messages sent by you")
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};
