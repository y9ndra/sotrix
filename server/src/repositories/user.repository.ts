import mongoose, { ClientSession } from "mongoose";
import User, { IUser } from "../models/user.model";

export interface IUserRepository {
  findById(
    id: string,
    options?: { session?: ClientSession; select?: string }
  ): Promise<IUser | null>;
  findByUsername(
    username: string,
    excludeId?: string
  ): Promise<IUser | null>;
  findByEmail(
    email: string,
    excludeId?: string
  ): Promise<IUser | null>;
  findByEmailOrUsername(
    identifier: string,
    username?: string
  ): Promise<IUser | null>;
  create(
    userData: Partial<IUser>
  ): Promise<IUser>;
  updateById(
    id: string,
    updates: Partial<IUser> | Record<string, any>,
    options?: {
      session?: ClientSession;
      select?: string;
      new?: boolean;
      runValidators?: boolean;
    }
  ): Promise<IUser | null>;
  incrementFollowers(
    userId: string,
    delta: number,
    session?: ClientSession
  ): Promise<IUser | null>;
  incrementFollowing(
    userId: string,
    delta: number,
    session?: ClientSession
  ): Promise<IUser | null>;
  searchUsers(
    filter: any,
    limit: number
  ): Promise<IUser[]>;
}

export class MongoUserRepository implements IUserRepository {
  async findById(
    id: string,
    options?: { session?: ClientSession; select?: string }
  ): Promise<IUser | null> {
    const query = User.findById(id);
    if (options?.select) query.select(options.select);
    if (options?.session) query.session(options.session);
    return query.exec();
  }

  async findByUsername(
    username: string,
    excludeId?: string
  ): Promise<IUser | null> {
    const filter: any = { username };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return User.findOne(filter).exec();
  }

  async findByEmail(
    email: string,
    excludeId?: string
  ): Promise<IUser | null> {
    const filter: any = { email };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return User.findOne(filter).exec();
  }

  async findByEmailOrUsername(
    identifier: string,
    username?: string
  ): Promise<IUser | null> {
    const conditions: any[] = [{ email: identifier }];
    if (username) {
      conditions.push({ username });
    } else {
      conditions.push({ username: identifier });
    }
    return User.findOne({
      $or: conditions,
    }).exec();
  }

  async create(
    userData: Partial<IUser>
  ): Promise<IUser> {
    return User.create(userData);
  }

  async updateById(
    id: string,
    updates: Partial<IUser> | Record<string, any>,
    options?: {
      session?: ClientSession;
      select?: string;
      new?: boolean;
      runValidators?: boolean;
    }
  ): Promise<IUser | null> {
    const query = User.findByIdAndUpdate(id, updates, {
      new: options?.new ?? true,
      runValidators: options?.runValidators ?? true,
      session: options?.session,
    });
    if (options?.select) query.select(options.select);
    return query.exec();
  }

  async incrementFollowers(
    userId: string,
    delta: number,
    session?: ClientSession
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      { $inc: { followersCount: delta } },
      { new: true, returnDocument: "after", session }
    ).exec();
  }

  async incrementFollowing(
    userId: string,
    delta: number,
    session?: ClientSession
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      { $inc: { followingCount: delta } },
      { session }
    ).exec();
  }

  async searchUsers(
    filter: any,
    limit: number
  ): Promise<IUser[]> {
    return User.find(filter)
      .select("_id username name bio followersCount profilePicUrl createdAt")
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(limit)
      .exec();
  }
}

export const userRepository = new MongoUserRepository();
