import mongoose, { Schema, Document } from "mongoose";

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  participantKey: string;
  lastMessage?: {
    content: string;
    sender: mongoose.Types.ObjectId;
    createdAt: Date;
  };
  lastRead?: Map<string, Date>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    lastMessage: {
      content: { type: String },
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },

    lastRead: {
      type: Map,
      of: Date,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Index to find conversations for a user
conversationSchema.index({ participants: 1 });

// Compound index to quickly fetch conversations for a user sorted by recent activity
conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);

export default Conversation;
