import mongoose from "mongoose";
import { FollowService } from "../../src/services/follow.service";
import User from "../../src/models/user.model";
import Follow from "../../src/models/follow.model";
import {
  IUserRepository,
  IFollowRepository,
} from "../../src/repositories";

class FakeUserRepository implements IUserRepository {
  public users: Map<string, any> = new Map();

  async findById(id: string): Promise<any> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByUsername(username: string, excludeId?: string): Promise<any> {
    for (const [id, user] of this.users.entries()) {
      if (user.username === username && id !== excludeId) {
        return { ...user };
      }
    }
    return null;
  }

  async findByEmailOrUsername(
    identifier: string,
    username?: string
  ): Promise<any> {
    for (const user of this.users.values()) {
      if (
        user.email === identifier ||
        user.username === identifier ||
        (username && user.username === username)
      ) {
        return { ...user };
      }
    }
    return null;
  }

  async create(userData: any): Promise<any> {
    const id = userData._id?.toString() || new mongoose.Types.ObjectId().toString();
    const newUser = {
      _id: id,
      followersCount: 0,
      followingCount: 0,
      ...userData,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateById(id: string, updates: any): Promise<any> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async incrementFollowers(userId: string, delta: number): Promise<any> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.followersCount = Math.max(0, (user.followersCount || 0) + delta);
    this.users.set(userId, user);
    return { ...user };
  }

  async incrementFollowing(userId: string, delta: number): Promise<any> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.followingCount = Math.max(0, (user.followingCount || 0) + delta);
    this.users.set(userId, user);
    return { ...user };
  }

  async searchUsers(filter: any, limit: number): Promise<any[]> {
    return Array.from(this.users.values()).slice(0, limit);
  }
}

class FakeFollowRepository implements IFollowRepository {
  public follows: Map<string, any> = new Map();

  private getKey(followerId: string, followingId: string): string {
    return `${followerId}_${followingId}`;
  }

  async findFollow(followerId: string, followingId: string): Promise<any> {
    const key = this.getKey(followerId, followingId);
    return this.follows.get(key) || null;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return this.follows.has(this.getKey(followerId, followingId));
  }

  async create(followerId: string, followingId: string): Promise<any> {
    const id = new mongoose.Types.ObjectId().toString();
    const record = {
      _id: id,
      follower: followerId,
      following: followingId,
      createdAt: new Date(),
    };
    this.follows.set(this.getKey(followerId, followingId), record);
    return record;
  }

  async deleteById(id: string): Promise<any> {
    for (const [key, record] of this.follows.entries()) {
      if (record._id === id || record._id?.toString() === id?.toString()) {
        this.follows.delete(key);
        return record;
      }
    }
    return null;
  }

  async findFollowingIn(
    followerId: string,
    targetIds: any[]
  ): Promise<{ following: any }[]> {
    const results: { following: any }[] = [];
    for (const targetId of targetIds) {
      const targetStr = targetId.toString();
      if (this.follows.has(this.getKey(followerId, targetStr))) {
        results.push({ following: targetStr });
      }
    }
    return results;
  }

  async findAllFollowingIds(followerId: string): Promise<string[]> {
    const results: string[] = [];
    for (const record of this.follows.values()) {
      if (record.follower === followerId) {
        results.push(record.following.toString());
      }
    }
    return results;
  }

  async createIndexes(): Promise<void> {
    // No-op for in-memory fake
  }
}

describe("FollowService (with Dependency Injected Fake Repositories)", () => {
  let fakeUserRepo: FakeUserRepository;
  let fakeFollowRepo: FakeFollowRepository;
  let followService: FollowService;

  const followerId = new mongoose.Types.ObjectId().toString();
  const targetId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    fakeUserRepo = new FakeUserRepository();
    fakeFollowRepo = new FakeFollowRepository();

    // Populate initial users
    await fakeUserRepo.create({
      _id: followerId,
      username: "follower_user",
      name: "Follower",
      followersCount: 0,
      followingCount: 0,
    });

    await fakeUserRepo.create({
      _id: targetId,
      username: "target_user",
      name: "Target",
      followersCount: 0,
      followingCount: 0,
    });

    // Inject fake repositories into service
    followService = new FollowService(fakeUserRepo, fakeFollowRepo);
  });

  describe("Validation & Business Rules", () => {
    it("should throw error if user ID format is invalid", async () => {
      await expect(
        followService.toggleFollow("invalid-id", targetId)
      ).rejects.toThrow("Invalid User ID format");
    });

    it("should throw error if user tries to follow themselves", async () => {
      await expect(
        followService.toggleFollow(followerId, followerId)
      ).rejects.toThrow("You cannot follow yourself");
    });

    it("should throw error if target user does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        followService.toggleFollow(followerId, nonExistentId)
      ).rejects.toThrow("User not found");
    });
  });

  describe("Follow & Unfollow State Transitions", () => {
    it("should follow a user when not currently following", async () => {
      const result = await followService.toggleFollow(followerId, targetId);

      expect(result.following).toBe(true);
      expect(result.followersCount).toBe(1);

      const target = await fakeUserRepo.findById(targetId);
      const follower = await fakeUserRepo.findById(followerId);

      expect(target.followersCount).toBe(1);
      expect(follower.followingCount).toBe(1);

      const isFollowing = await fakeFollowRepo.isFollowing(followerId, targetId);
      expect(isFollowing).toBe(true);
    });

    it("should unfollow a user when already following", async () => {
      // First follow
      await followService.toggleFollow(followerId, targetId);

      // Now unfollow
      const result = await followService.toggleFollow(followerId, targetId);

      expect(result.following).toBe(false);
      expect(result.followersCount).toBe(0);

      const target = await fakeUserRepo.findById(targetId);
      const follower = await fakeUserRepo.findById(followerId);

      expect(target.followersCount).toBe(0);
      expect(follower.followingCount).toBe(0);

      const isFollowing = await fakeFollowRepo.isFollowing(followerId, targetId);
      expect(isFollowing).toBe(false);
    });
  });

  describe("Followers & Following Search", () => {
    let aliceId: string;
    let bobId: string;

    beforeEach(async () => {
      aliceId = new mongoose.Types.ObjectId().toString();
      bobId = new mongoose.Types.ObjectId().toString();

      // Create users in MongoDB so aggregation $lookup works
      await User.create([
        {
          _id: aliceId,
          username: "alice_wonder",
          name: "Alice Wonderland",
          email: "alice@example.com",
          password: "password123",
          followersCount: 0,
          followingCount: 0,
        },
        {
          _id: bobId,
          username: "bob_builder",
          name: "Bob Builder",
          email: "bob@example.com",
          password: "password123",
          followersCount: 0,
          followingCount: 0,
        },
      ]);

      // Target user follows Alice and Bob (they are following target)
      await Follow.create([
        { follower: aliceId, following: targetId },
        { follower: bobId, following: targetId },
        { follower: targetId, following: aliceId },
        { follower: targetId, following: bobId },
      ]);
    });

    it("should search followers by username or name using server-side query", async () => {
      const result = await followService.getFollowers(targetId, followerId, 10, undefined, "alice");

      expect(result.data.length).toBe(1);
      expect(result.data[0].username).toBe("alice_wonder");
      expect(result.data[0].name).toBe("Alice Wonderland");
    });

    it("should return empty list when no followers match search query", async () => {
      const result = await followService.getFollowers(targetId, followerId, 10, undefined, "nonexistent");

      expect(result.data.length).toBe(0);
    });

    it("should search following by username or name using server-side query", async () => {
      const result = await followService.getFollowing(targetId, followerId, 10, undefined, "builder");

      expect(result.data.length).toBe(1);
      expect(result.data[0].username).toBe("bob_builder");
      expect(result.data[0].name).toBe("Bob Builder");
    });
  });
});
