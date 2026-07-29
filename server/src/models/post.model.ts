import mongoose, { Schema, Document } from "mongoose";

export interface IPost extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({
  createdAt: -1,
  _id: -1,
});

const Post = mongoose.model<IPost>("Post", postSchema);

export default Post;
