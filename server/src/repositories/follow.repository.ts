import mongoose, { ClientSession } from "mongoose";
import Follow, { IFollow } from "../models/follow.model";

export interface IFollowRepository {
  findFollow(
    followerId: string,
    followingId: string,
    session?: ClientSession
  ): Promise<IFollow | null>;
  isFollowing(
    followerId: string,
    followingId: string
  ): Promise<boolean>;
  create(
    followerId: string,
    followingId: string,
    session?: ClientSession
  ): Promise<IFollow>;
  deleteById(
    id: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<any>;
  findFollowingIn(
    followerId: string,
    targetIds: any[]
  ): Promise<{ following: any }[]>;
  createIndexes(): Promise<void>;
}

export class MongoFollowRepository implements IFollowRepository {
  async findFollow(
    followerId: string,
    followingId: string,
    session?: ClientSession
  ): Promise<IFollow | null> {
    const query = Follow.findOne({
      follower: followerId,
      following: followingId,
    });
    if (session) query.session(session);
    return query.exec();
  }

  async isFollowing(
    followerId: string,
    followingId: string
  ): Promise<boolean> {
    const exists = await Follow.exists({
      follower: followerId,
      following: followingId,
    });
    return !!exists;
  }

  async create(
    followerId: string,
    followingId: string,
    session?: ClientSession
  ): Promise<IFollow> {
    if (session) {
      const docs = await Follow.create(
        [{ follower: followerId, following: followingId }],
        { session }
      );
      return docs[0];
    }
    return Follow.create({
      follower: followerId,
      following: followingId,
    });
  }

  async deleteById(
    id: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<any> {
    const query = Follow.findByIdAndDelete(id);
    if (session) query.session(session);
    return query.exec();
  }

  async findFollowingIn(
    followerId: string,
    targetIds: any[]
  ): Promise<{ following: any }[]> {
    return Follow.find({
      follower: followerId,
      following: { $in: targetIds },
    })
      .select("following")
      .exec();
  }

  async createIndexes(): Promise<void> {
    await Follow.createIndexes().catch(() => {});
  }
}

export const followRepository = new MongoFollowRepository();
