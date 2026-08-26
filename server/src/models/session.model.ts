import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string | null;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    previousRefreshTokenHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    absoluteExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISession>("Session", sessionSchema);
