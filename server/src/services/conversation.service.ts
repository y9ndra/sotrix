import mongoose from "mongoose";
import Conversation, { IConversation } from "../models/conversation.model";
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
): Promise<IConversation> => {
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

  if (existing) {
    return existing;
  }

  try {
    const newConversation = await Conversation.create({
      participants: [userA, userB],
      participantKey,
    });

    return await newConversation.populate(
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
        return raceExisting;
      }
    }

    throw error;
  }
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
): Promise<IConversation | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid ID format");
  }

  return Conversation.findOne({
    _id: conversationId,
    participants: userId,
  }).populate("participants", "name username profilePicUrl");
};

/**
 * Fetches all conversations where the user is a participant, sorted by most recent activity
 */
export const getUserConversations = async (
  userId: string
): Promise<IConversation[]> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  return Conversation.find({
    participants: userId,
  })
    .populate("participants", "name username profilePicUrl")
    .sort({ updatedAt: -1 });
};
