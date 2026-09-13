import Post from "../models/post.model";

export interface IPostRepository {
  countByAuthor(authorId: string): Promise<number>;
}

export class MongoPostRepository implements IPostRepository {
  async countByAuthor(authorId: string): Promise<number> {
    return Post.countDocuments({ author: authorId }).exec();
  }
}

export const postRepository = new MongoPostRepository();
