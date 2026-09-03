import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import Message, { IMessage } from "../models/message.model";
import "../models/user.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";

export interface CursorParam {
  createdAt: Date | string;
  id: string;
}

export interface PaginatedMessagesResult {
  data: IMessage[];
  nextCursor: string | null;
  nextCursorObj: {
    createdAt: Date;
    id: string;
  } | null;
  hasMore: boolean;
}

/**
 * Creates and persists a new message in a conversation.
 * Verifies that the sender is an authorized participant of the conversation.
 */
export const createMessage = async (
  conversationId: string,
  senderId: string,
  content: string
): Promise<IMessage> => {
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(senderId)
  ) {
    throw new Error("Invalid ID format");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const trimmedContent = content ? content.trim() : "";

  if (!trimmedContent) {
    throw new Error("Message cannot be empty");
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    content: trimmedContent,
  });

  // Touch conversation timestamp so recent active chats appear at top of inbox
  conversation.updatedAt = new Date();
  await conversation.save();

  await message.populate("sender", "name username profilePicUrl");

  return message;
};

/**
 * Retrieves chat history for a conversation using cursor pagination.
 * Verifies that the requesting user is a participant of the conversation.
 */
export const getMessages = async (
  conversationId: string,
  userId: string,
  cursor?: string | CursorParam,
  limit: number = 20
): Promise<PaginatedMessagesResult> => {
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid ID format");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const query: any = {
    conversation: conversationId,
  };

  if (cursor) {
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;

    if (typeof cursor === "string") {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        cursorDate = new Date(decoded.createdAt);
        cursorId = decoded.id;
      }
    } else if (cursor.createdAt && cursor.id) {
      cursorDate = new Date(cursor.createdAt);
      cursorId = cursor.id.toString();
    }

    if (cursorDate && cursorId) {
      query.$or = [
        {
          createdAt: {
            $lt: cursorDate,
          },
        },
        {
          createdAt: cursorDate,
          _id: {
            $lt: cursorId,
          },
        },
      ];
    }
  }

  // Fetch limit + 1 to check if there are more messages without an extra count query
  const messages = await Message.find(query)
    .populate("sender", "name username profilePicUrl")
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;

  const lastMessage = data[data.length - 1];

  let nextCursor: string | null = null;
  let nextCursorObj: { createdAt: Date; id: string } | null = null;

  if (hasMore && lastMessage) {
    nextCursorObj = {
      createdAt: lastMessage.createdAt,
      id: lastMessage._id.toString(),
    };
    nextCursor = encodeCursor({
      createdAt: (lastMessage.createdAt as Date).toISOString(),
      id: lastMessage._id.toString(),
    });
  }

  return {
    data,
    nextCursor,
    nextCursorObj,
    hasMore,
  };
};
