import mongoose from "mongoose";
import Like from "../models/like.model";
import Post from "../models/post.model";

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
  postAuthorId: string;
}

const toggleLikeWithoutTransaction = async (
  userId: string,
  postId: string
): Promise<ToggleLikeResult> => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error("Post not found");
  }

  const existingLike = await Like.findOne({
    user: userId,
    post: postId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likeCount: -1 } },
      { returnDocument: 'after' }
    );
    return {
      liked: false,
      likeCount: updatedPost ? Math.max(0, updatedPost.likeCount) : 0,
      postAuthorId: post.author.toString(),
    };
  } else {
    await Like.create({
      user: userId,
      post: postId,
    });
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likeCount: 1 } },
      { returnDocument: 'after' }
    );
    return {
      liked: true,
      likeCount: updatedPost ? Math.max(0, updatedPost.likeCount) : 0,
      postAuthorId: post.author.toString(),
    };
  }
};

export const toggleLike = async (
  userId: string,
  postId: string
): Promise<ToggleLikeResult> => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new Error("Invalid post ID");
  }

  // Pre-create indexes to prevent catalog change lock conflicts inside transaction
  await Like.createIndexes().catch(() => {});

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const post = await Post.findById(postId).session(session);
      if (!post) {
        throw new Error("Post not found");
      }

      const existingLike = await Like.findOne({
        user: userId,
        post: postId,
      }).session(session);

      let liked = false;
      let updatedPost;

      if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id).session(session);
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { $inc: { likeCount: -1 } },
          { returnDocument: 'after', session }
        );
        liked = false;
      } else {
        await Like.create(
          [
            {
              user: userId,
              post: postId,
            },
          ],
          { session }
        );
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { $inc: { likeCount: 1 } },
          { returnDocument: 'after', session }
        );
        liked = true;
      }

      await session.commitTransaction();
      session.endSession();

      return {
        liked,
        likeCount: updatedPost ? Math.max(0, updatedPost.likeCount) : 0,
        postAuthorId: post.author.toString(),
      };
    } catch (error: any) {
      if (session) {
        await session.abortTransaction().catch(() => {});
        session.endSession();
      }

      const isTransient =
        error?.errorLabels?.includes("TransientTransactionError") ||
        (typeof error?.message === "string" &&
          (error.message.includes("WriteConflict") ||
            error.message.includes("catalog changes")));

      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }

      // If transactions are not supported on standalone MongoDB instance, fallback cleanly
      if (
        error &&
        typeof error.message === "string" &&
        (error.message.includes("Transaction numbers are only allowed") ||
          error.message.includes("standalone"))
      ) {
        return toggleLikeWithoutTransaction(userId, postId);
      }

      throw error;
    }
  }

  return toggleLikeWithoutTransaction(userId, postId);
};
