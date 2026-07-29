import mongoose, { Schema, Document } from "mongoose";

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

followSchema.index(
  {
    follower: 1,
    following: 1,
  },
  {
    unique: true,
  }
);

const Follow = mongoose.model<IFollow>("Follow", followSchema);

export default Follow;
