import mongoose from "mongoose";
import Conversation, { IConversation } from "../models/conversation.model";
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

  return conversations.map((conv) => {
    const convObj: any = conv.toObject();
    convObj.participants = (convObj.participants || []).map((p: any) => ({
      ...p,
      isFollowing: followingSet.has((p._id || p).toString()),
    }));
    return convObj;
  });
};
