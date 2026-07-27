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
