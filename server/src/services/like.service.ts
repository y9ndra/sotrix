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
    const count = await Like.countDocuments({ post: postId });
    await Post.findByIdAndUpdate(postId, { likeCount: count });
    return {
      liked: false,
      likeCount: count,
      postAuthorId: post.author.toString(),
    };
  } else {
    await Like.create({
      user: userId,
      post: postId,
    });
    const count = await Like.countDocuments({ post: postId });
    await Post.findByIdAndUpdate(postId, { likeCount: count });
    return {
      liked: true,
      likeCount: count,
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
      let newLikeCount = 0;

      if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id).session(session);
        const count = await Like.countDocuments({ post: postId }).session(session);
        await Post.findByIdAndUpdate(
          postId,
          { likeCount: count },
          { session }
        );
        liked = false;
        newLikeCount = count;
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
        const count = await Like.countDocuments({ post: postId }).session(session);
        await Post.findByIdAndUpdate(
          postId,
          { likeCount: count },
          { session }
        );
        liked = true;
        newLikeCount = count;
      }

      await session.commitTransaction();
      session.endSession();

      return {
        liked,
        likeCount: newLikeCount,
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

export const syncLikeCounts = async (): Promise<void> => {
  try {
    // 1. Reset any posts with negative likeCount to 0
    await Post.updateMany({ likeCount: { $lt: 0 } }, { $set: { likeCount: 0 } });

    // 2. Count actual likes from Like collection
    const likeCounts = await Like.aggregate([
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);

    if (likeCounts.length > 0) {
      const bulkOps = likeCounts.map((lc) => ({
        updateOne: {
          filter: { _id: lc._id },
          update: { $set: { likeCount: lc.count } },
        },
      }));
      await Post.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error("Failed to sync like counts:", err);
  }
};

