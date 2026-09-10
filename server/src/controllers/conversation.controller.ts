import { Request, Response, NextFunction } from "express";
import {
  getOrCreateConversation,
  getUserConversations as getUserConversationsService,
  getConversationForUser,
  markConversationAsRead,
} from "../services/conversation.service";
import { getMessages as getMessagesService } from "../services/message.service";
import { getSocketIO } from "../socket/socket.manager";
import { getUserRoom } from "../socket/socketRooms";

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
