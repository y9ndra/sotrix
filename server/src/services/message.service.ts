import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import Message, { IMessage } from "../models/message.model";
import "../models/user.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";
import { messageRepository } from "../repositories/message.repository";

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
  content: string,
  replyToId?: string
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

  let validReplyToId: string | null = null;
  if (replyToId && mongoose.Types.ObjectId.isValid(replyToId)) {
    const targetMsg = await Message.findOne({
      _id: replyToId,
      conversation: conversationId,
    });
    if (targetMsg) {
      validReplyToId = targetMsg._id.toString();
    }
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    content: trimmedContent,
    replyTo: validReplyToId || undefined,
  });

  const messageDate = message.createdAt || new Date();

  // Touch conversation timestamp and update lastMessage & sender's lastRead
  conversation.updatedAt = messageDate;
  conversation.lastMessage = {
    content: trimmedContent,
    sender: new mongoose.Types.ObjectId(senderId),
    createdAt: messageDate,
  } as any;

  if (!conversation.lastRead) {
    conversation.lastRead = new Map();
  }
  conversation.lastRead.set(senderId.toString(), messageDate);
  conversation.markModified("lastRead");
  await conversation.save();

  await message.populate([
    { path: "sender", select: "name username profilePicUrl" },
    {
      path: "replyTo",
      select: "content sender createdAt isEdited deletedFor",
      populate: { path: "sender", select: "name username profilePicUrl" },
    },
  ]);

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

  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();



  // Check if the other participant has read messages sent by this user
  const otherParticipant = conversation.participants.find(
    (p: any) => (p._id || p).toString() !== userId.toString()
  );
  const otherId = (otherParticipant?._id || otherParticipant)?.toString();
  const otherLastRead = otherId
    ? (conversation.lastRead instanceof Map
        ? conversation.lastRead.get(otherId)
        : (conversation.lastRead as any)?.[otherId])
    : null;

  if (otherLastRead) {
    await Message.updateMany(
      {
        conversation: convObjectId,
        sender: userObjectId,
        createdAt: { $lte: new Date(otherLastRead) },
        isRead: { $ne: true },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(otherLastRead),
        },
      }
    );
  }

  const query: any = {
    conversation: convObjectId,
    deletedFor: { $ne: userObjectId },
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
    .populate({
      path: "replyTo",
      select: "content sender createdAt isEdited deletedFor isRead readAt",
      populate: { path: "sender", select: "name username profilePicUrl" },
    })
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;

  // Check this user's lastRead timestamp to accurately determine incoming unread boundary
  const myLastRead = conversation.lastRead instanceof Map
    ? conversation.lastRead.get(userId.toString())
    : (conversation.lastRead as any)?.[userId.toString()];
  const myLastReadTime = myLastRead ? new Date(myLastRead).getTime() : 0;

  // Sync isRead status:
  // - On outgoing messages: mark read if sent before or at other user's lastRead
  // - On incoming messages: mark read if sent before or at this user's lastRead
  data.forEach((m: any) => {
    const sId = (m.sender?._id || m.sender)?.toString();
    if (sId === userId.toString()) {
      if (otherLastRead) {
        const otherReadTime = new Date(otherLastRead).getTime();
        if (!m.isRead && new Date(m.createdAt).getTime() <= otherReadTime) {
          m.isRead = true;
          m.readAt = new Date(otherLastRead);
          if (m._doc) {
            m._doc.isRead = true;
            m._doc.readAt = new Date(otherLastRead);
          }
        }
      }
    } else {
      if (myLastReadTime > 0) {
        const msgTime = new Date(m.createdAt).getTime();
        if (msgTime <= myLastReadTime) {
          m.isRead = true;
          if (m._doc) m._doc.isRead = true;
        } else {
          m.isRead = false;
          if (m._doc) m._doc.isRead = false;
        }
      } else {
        m.isRead = false;
        if (m._doc) m._doc.isRead = false;
      }
    }
  });

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

  // If opening conversation (initial load without pagination cursor),
  // permanently mark all incoming messages as read in the DB and update lastRead for subsequent visits.
  // We do this AFTER querying messages so that this initial response preserves the incoming unread state,
  // allowing the client to locate the unread boundary and position the view accurately.
  if (!cursor) {
    Promise.all([
      Conversation.findById(convObjectId).then((conv) => {
        if (conv) {
          if (!conv.lastRead) {
            conv.lastRead = new Map();
          }
          conv.lastRead.set(userId.toString(), now);
          conv.markModified("lastRead");
          return conv.save();
        }
      }),
      Message.updateMany(
        {
          conversation: convObjectId,
          sender: { $ne: userObjectId },
        },
        {
          $set: {
            isRead: true,
            readAt: now,
          },
        }
      ),
    ]).catch((err) =>
      console.error("Error permanently updating read status in getMessages:", err)
    );
  }

  return {
    data,
    nextCursor,
    nextCursorObj,
    hasMore,
  };
};

/**
 * Edits an existing message's content if the requesting user is the sender.
 * Also updates conversation lastMessage if this was the latest message.
 */
export const editMessage = async (
  messageId: string,
  userId: string,
  content: string
): Promise<IMessage> => {
  if (
    !mongoose.Types.ObjectId.isValid(messageId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid ID format");
  }

  const trimmedContent = content ? content.trim() : "";
  if (!trimmedContent) {
    throw new Error("Message cannot be empty");
  }

  const message = await messageRepository.findById(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== userId) {
    throw new Error("You are not authorized to edit this message");
  }

  const updatedMessage = await messageRepository.updateContent(
    messageId,
    trimmedContent
  );

  if (!updatedMessage) {
    throw new Error("Failed to update message");
  }

  await updatedMessage.populate([
    { path: "sender", select: "name username profilePicUrl" },
    {
      path: "replyTo",
      select: "content sender createdAt isEdited deletedFor",
      populate: { path: "sender", select: "name username profilePicUrl" },
    },
  ]);

  // If this message was the conversation's latest message, update lastMessage content
  const conversation = await Conversation.findById(updatedMessage.conversation);
  if (conversation) {
    const latestMsg = await messageRepository.findLatestInConversation(
      updatedMessage.conversation
    );

    if (latestMsg && latestMsg._id.toString() === updatedMessage._id.toString()) {
      conversation.lastMessage = {
        content: trimmedContent,
        sender: updatedMessage.sender,
        createdAt: latestMsg.createdAt,
      } as any;
      await conversation.save();
    }
  }

  return updatedMessage;
};

export type DeleteMessageMode = "for_me" | "for_everyone";

/**
 * Deletes a message selectively:
 * - "for_me": Hides message for requesting user by adding their ID to deletedFor
 * - "for_everyone": Purges message from database and updates conversation lastMessage (author only)
 */
export const deleteMessage = async (
  messageId: string,
  userId: string,
  mode: DeleteMessageMode = "for_everyone"
): Promise<{
  conversationId: string;
  messageId: string;
  mode: DeleteMessageMode;
}> => {
  if (
    !mongoose.Types.ObjectId.isValid(messageId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid ID format");
  }

  const message = await messageRepository.findById(messageId);
  if (!message) {
    return { conversationId: "", messageId, mode };
  }

  const conversationId = message.conversation.toString();

  // Verify caller is an authorized participant of the conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  if (mode === "for_me") {
    await messageRepository.deleteForUser(messageId, userId);
    return { conversationId, messageId, mode: "for_me" };
  }

  // mode === "for_everyone": Only the message author can delete for everyone
  if (message.sender.toString() !== userId) {
    throw new Error("You are not authorized to delete this message for everyone");
  }

  await messageRepository.deleteById(messageId);

  // Update conversation lastMessage to the next latest message (or clear it)
  const latestMsg = await messageRepository.findLatestInConversation(
    conversationId
  );

  if (latestMsg) {
    conversation.lastMessage = {
      content: latestMsg.content,
      sender: latestMsg.sender,
      createdAt: latestMsg.createdAt,
    } as any;
  } else {
    conversation.lastMessage = undefined;
  }
  await conversation.save();

  return { conversationId, messageId, mode: "for_everyone" };
};

/**
 * Batch deletes multiple messages selectively:
 * - "for_me": Hides all specified messages for requesting user
 * - "for_everyone": Purges messages sent by the user for everyone
 */
export const batchDeleteMessages = async (
  messageIds: string[],
  userId: string,
  mode: DeleteMessageMode = "for_everyone"
): Promise<{
  conversationId: string;
  messageIds: string[];
  mode: DeleteMessageMode;
}> => {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new Error("Message IDs array is required");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid ID format");
  }

  const validIds = messageIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new Error("No valid message IDs provided");
  }

  const messages = await Message.find({ _id: { $in: validIds } });
  if (messages.length === 0) {
    return { conversationId: "", messageIds: [], mode };
  }

  const conversationId = messages[0].conversation.toString();

  // Verify caller is an authorized participant of this conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  if (mode === "for_me") {
    await messageRepository.deleteManyForUser(validIds, userId);
    return { conversationId, messageIds: validIds, mode: "for_me" };
  }

  // mode === "for_everyone": Ensure all messages belong to requesting user
  const unauthorized = messages.some((m) => m.sender.toString() !== userId);
  if (unauthorized) {
    throw new Error("You can only delete messages sent by you for everyone");
  }

  await messageRepository.deleteManyByIds(validIds);

  // Update conversation lastMessage to the next latest remaining message
  const latestMsg = await messageRepository.findLatestInConversation(
    conversationId
  );

  if (latestMsg) {
    conversation.lastMessage = {
      content: latestMsg.content,
      sender: latestMsg.sender,
      createdAt: latestMsg.createdAt,
    } as any;
  } else {
    conversation.lastMessage = undefined;
  }
  await conversation.save();

  return { conversationId, messageIds: validIds, mode: "for_everyone" };
};
