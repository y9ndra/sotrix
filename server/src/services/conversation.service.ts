import mongoose from "mongoose";
import Conversation, { IConversation } from "../models/conversation.model";
import Message from "../models/message.model";
import Follow from "../models/follow.model";
import "../models/user.model"; // Ensure User model is registered for populate

/**
 * Creates a deterministic participant key for one-to-one chats
 * e.g., ["65a", "65b"].sort().join("_") -> "65a_65b"
 */
export const createParticipantKey = (
  userA: string,
  userB: string
): string => {
  return [userA.toString(), userB.toString()].sort().join("_");
};

/**
 * Gets an existing conversation between two users or creates a new one.
 * Handles concurrent creation race conditions gracefully via the unique participantKey index.
 */
export const getOrCreateConversation = async (
  userA: string,
  userB: string
): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(userA) || !mongoose.Types.ObjectId.isValid(userB)) {
    throw new Error("Invalid user ID");
  }

  if (userA.toString() === userB.toString()) {
    throw new Error("Cannot create a conversation with yourself");
  }

  const participantKey = createParticipantKey(userA, userB);

  const existing = await Conversation.findOne({ participantKey }).populate(
    "participants",
    "name username profilePicUrl"
  );

  let convToReturn = existing;

  if (!convToReturn) {
    // Only followers can initiate a conversation with a user
    const isFollower = await Follow.exists({
      $or: [
        {
          follower: new mongoose.Types.ObjectId(userA),
          following: new mongoose.Types.ObjectId(userB),
        },
        {
          follower: new mongoose.Types.ObjectId(userB),
          following: new mongoose.Types.ObjectId(userA),
        },
      ],
    });

    if (!isFollower) {
      throw new Error("Only followers can message this user");
    }

    try {
      const newConversation = await Conversation.create({
        participants: [userA, userB],
        participantKey,
      });

      convToReturn = await newConversation.populate(
        "participants",
        "name username profilePicUrl"
      );
    } catch (error: any) {
      // Handle duplicate key error (code 11000) from concurrent creation race
      if (error.code === 11000) {
        const raceExisting = await Conversation.findOne({ participantKey }).populate(
          "participants",
          "name username profilePicUrl"
        );
        if (raceExisting) {
          convToReturn = raceExisting;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  const isFollowingB = await Follow.exists({
    follower: userA,
    following: userB,
  });

  const convObj: any = convToReturn.toObject ? convToReturn.toObject() : convToReturn;
  convObj.participants = (convObj.participants || []).map((p: any) => {
    const pObj = p.toObject ? p.toObject() : p;
    return {
      ...pObj,
      isFollowing: (pObj._id || pObj).toString() === userB.toString() ? Boolean(isFollowingB) : false,
    };
  });
  convObj.hasUnread = false;

  return convObj;
};

/**
 * Fetches a conversation by ID
 */
export const getConversationById = async (
  conversationId: string
): Promise<IConversation | null> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversation ID");
  }

  return Conversation.findById(conversationId).populate(
    "participants",
    "name username profilePicUrl"
  );
};

/**
 * Fetches a conversation by ID, verifying that the requesting user is a participant
 */
export const getConversationForUser = async (
  conversationId: string,
  userId: string
): Promise<any | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid ID format");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  }).populate("participants", "name username profilePicUrl");

  if (!conversation) return null;

  const convObj: any = conversation.toObject();
  const otherParticipants = (convObj.participants || []).filter(
    (p: any) => (p._id || p).toString() !== userId.toString()
  );
  const otherIds = otherParticipants.map((p: any) => p._id || p);

  const followings = await Follow.find({
    follower: userId,
    following: { $in: otherIds },
  }).select("following");

  const followingSet = new Set(followings.map((f) => f.following.toString()));

  convObj.participants = (convObj.participants || []).map((p: any) => ({
    ...p,
    isFollowing: followingSet.has((p._id || p).toString()),
  }));

  // Determine latest non-deleted message for requesting user
  const latestMsg = await Message.findOne({
    conversation: new mongoose.Types.ObjectId(conversationId),
    deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
  }).sort({ createdAt: -1, _id: -1 });

  if (latestMsg) {
    convObj.lastMessage = {
      content: latestMsg.isDeleted ? "This message was deleted" : latestMsg.content,
      sender: latestMsg.sender,
      createdAt: latestMsg.createdAt,
      isDeleted: latestMsg.isDeleted || false,
    };
  } else {
    convObj.lastMessage = undefined;
  }

  // Determine unread status for requesting user
  let hasUnread = false;
  if (convObj.lastMessage && convObj.lastMessage.sender) {
    const senderId = (convObj.lastMessage.sender._id || convObj.lastMessage.sender).toString();
    const currentUserIdStr = userId.toString();
    if (senderId !== currentUserIdStr) {
      let lastReadDate: Date | undefined;
      if (conversation.lastRead instanceof Map) {
        lastReadDate = conversation.lastRead.get(currentUserIdStr);
      } else if (convObj.lastRead) {
        lastReadDate = convObj.lastRead[currentUserIdStr];
      }
      const messageCreatedAt = new Date(convObj.lastMessage.createdAt);
      if (!lastReadDate || new Date(lastReadDate) < messageCreatedAt) {
        hasUnread = true;
      }
    }
  }

  const unreadCount = await Message.countDocuments({
    conversation: new mongoose.Types.ObjectId(conversationId),
    sender: { $ne: new mongoose.Types.ObjectId(userId) },
    isRead: { $ne: true },
    deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
    isDeleted: { $ne: true },
  });

  convObj.hasUnread = unreadCount > 0 || hasUnread;
  convObj.unreadCount = unreadCount;

  return convObj;
};

/**
 * Fetches all conversations where the user is a participant, sorted by most recent activity
 */
export const getUserConversations = async (
  userId: string
): Promise<any[]> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate("participants", "name username profilePicUrl")
    .sort({ updatedAt: -1 });

  const otherUserIds = conversations.flatMap((c) =>
    (c.participants || [])
      .filter((p: any) => (p._id || p).toString() !== userId.toString())
      .map((p: any) => p._id || p)
  );

  const followings = await Follow.find({
    follower: userId,
    following: { $in: otherUserIds },
  }).select("following");

  const followingSet = new Set(followings.map((f) => f.following.toString()));

  const convIds = conversations.map((c) => c._id);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Compute unread counts and accurate latest non-deleted message for each conversation in parallel
  const [unreadCounts, latestMessages] = await Promise.all([
    Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          sender: { $ne: userObjectId },
          isRead: { $ne: true },
          deletedFor: { $ne: userObjectId },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$conversation",
          count: { $sum: 1 },
        },
      },
    ]),
    Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          deletedFor: { $ne: userObjectId },
        },
      },
      {
        $sort: {
          createdAt: -1,
          _id: -1,
        },
      },
      {
        $group: {
          _id: "$conversation",
          content: { $first: "$content" },
          sender: { $first: "$sender" },
          createdAt: { $first: "$createdAt" },
          isDeleted: { $first: "$isDeleted" },
        },
      },
    ]),
  ]);

  const unreadMap = new Map<string, number>(
    unreadCounts.map((u: any) => [u._id.toString(), u.count])
  );

  const latestMap = new Map<string, any>(
    latestMessages.map((lm: any) => [
      lm._id.toString(),
      {
        content: lm.isDeleted ? "This message was deleted" : lm.content,
        sender: lm.sender,
        createdAt: lm.createdAt,
        isDeleted: lm.isDeleted || false,
      },
    ])
  );

  return conversations.map((conv) => {
    const convObj: any = conv.toObject();
    convObj.participants = (convObj.participants || []).map((p: any) => ({
      ...p,
      isFollowing: followingSet.has((p._id || p).toString()),
    }));

    // Use the actual latest non-deleted message for this user (or clear if none remain)
    const activeLastMessage = latestMap.get(conv._id.toString()) || null;
    convObj.lastMessage = activeLastMessage || undefined;

    // Determine unread status for requesting user
    let hasUnread = false;
    if (convObj.lastMessage && convObj.lastMessage.sender) {
      const senderId = (convObj.lastMessage.sender._id || convObj.lastMessage.sender).toString();
      const currentUserIdStr = userId.toString();
      if (senderId !== currentUserIdStr) {
        let lastReadDate: Date | undefined;
        if (conv.lastRead instanceof Map) {
          lastReadDate = conv.lastRead.get(currentUserIdStr);
        } else if (convObj.lastRead) {
          lastReadDate = convObj.lastRead[currentUserIdStr];
        }
        const messageCreatedAt = new Date(convObj.lastMessage.createdAt);
        if (!lastReadDate || new Date(lastReadDate) < messageCreatedAt) {
          hasUnread = true;
        }
      }
    }

    const count = unreadMap.get(conv._id.toString()) || 0;
    convObj.hasUnread = count > 0 || hasUnread;
    convObj.unreadCount = count;

    return convObj;
  });
};

/**
 * Marks a conversation as read for a given user by updating lastRead to now
 * and marking all unread incoming messages as read
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<any> => {
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid ID format");
  }

  const now = new Date();
  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [conversation] = await Promise.all([
    Conversation.findOneAndUpdate(
      {
        _id: convObjectId,
        participants: userObjectId,
      },
      {
        $set: {
          [`lastRead.${userId}`]: now,
        },
      },
      { new: true }
    ).populate("participants", "name username profilePicUrl"),
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
  ]);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (!conversation.lastRead) {
    conversation.lastRead = new Map();
  }
  conversation.lastRead.set(userId.toString(), now);
  conversation.markModified("lastRead");
  await conversation.save();

  // Also check if the other participant read messages sent by this user
  const otherParticipant = (conversation.participants || []).find(
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

  const convObj: any = conversation.toObject();
  convObj.hasUnread = false;
  convObj.unreadCount = 0;
  return convObj;
};
