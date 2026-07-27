import Post, { IPost } from "../models/post.model";

interface CreatePostInput {
  content: string;
  author: string;
}

export const createPost = async ({
  content,
  author,
}: CreatePostInput): Promise<IPost> => {
  const post = await Post.create({
    content,
    author,
  });

  return post;
};

export const getPosts = async (): Promise<IPost[]> => {
  const posts = await Post.find()
    .populate("author", "name username email")
    .sort({ createdAt: -1 });

  return posts;
};

export const getPostById = async (postId: string): Promise<IPost> => {
  const post = await Post.findById(postId).populate("author", "name username email");

  if (!post) {
    throw new Error("Post not found");
  }

  return post;
};

export const updatePost = async (
  postId: string,
  userId: string,
  content: string
): Promise<IPost> => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to update this post");
  }

  post.content = content;
  await post.save();

  return post;
};

export const deletePost = async (
  postId: string,
  userId: string
): Promise<IPost> => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to delete this post");
  }

  await Post.findByIdAndDelete(postId);

  return post;
};
