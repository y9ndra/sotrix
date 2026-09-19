import User from "../../src/models/user.model";
import Post from "../../src/models/post.model";
import Follow from "../../src/models/follow.model";
import { searchUsersService } from "../../src/services/user.service";
import { searchPostsService } from "../../src/services/post.service";
import { getSuggestedUsers } from "../../src/services/explore.service";

describe("Day 37 — Text Search & Index Optimization Tests", () => {
  beforeAll(async () => {
    // Ensure indexes are built in the test database
    await User.syncIndexes();
    await Post.syncIndexes();
    await Follow.syncIndexes();
  });

  describe("1. User Search & Prefix Indexing", () => {
    let currentUserId: string;

    beforeEach(async () => {
      const currentUser = await User.create({
        username: "current_user",
        email: "current@test.com",
        password: "password123",
        name: "Current User",
      });
      currentUserId = currentUser._id.toString();

      await User.create([
        {
          username: "yugendra",
          email: "yugen@test.com",
          password: "password123",
          name: "Yugen Developer",
        },
        {
          username: "yugen_fan",
          email: "fan@test.com",
          password: "password123",
          name: "Fan of Yugen",
        },
        {
          username: "other_user",
          email: "other@test.com",
          password: "password123",
          name: "Someone Else",
        },
      ]);
    });

    it("should search users using prefix regex (^query)", async () => {
      const results = await searchUsersService("yugen", currentUserId);

      expect(results.length).toBe(2);
      const usernames = results.map((u: any) => u.username);
      expect(usernames).toContain("yugendra");
      expect(usernames).toContain("yugen_fan");
      expect(usernames).not.toContain("other_user");
    });

    it("should search users using substring matching", async () => {
      const results = await searchUsersService("fan", currentUserId);

      expect(results.length).toBe(1);
      expect(results[0].username).toBe("yugen_fan");
    });

    it("should show unfollowed users before followed users in search results", async () => {
      const followedUser = await User.findOne({ username: "yugendra" });
      await Follow.create({
        follower: currentUserId,
        following: followedUser!._id,
      });

      const results = await searchUsersService("yugen", currentUserId);
      expect(results.length).toBe(2);

      // Unfollowed user should come first
      expect(results[0].username).toBe("yugen_fan");
      expect(results[0].isFollowing).toBe(false);

      // Followed user should come in the end
      expect(results[1].username).toBe("yugendra");
      expect(results[1].isFollowing).toBe(true);
    });

    it("should show followed users when all matching users are followed", async () => {
      const followedUser1 = await User.findOne({ username: "yugendra" });
      const followedUser2 = await User.findOne({ username: "yugen_fan" });

      await Follow.create([
        { follower: currentUserId, following: followedUser1!._id },
        { follower: currentUserId, following: followedUser2!._id },
      ]);

      const results = await searchUsersService("yugen", currentUserId);
      expect(results.length).toBe(2);
      expect(results.every((u: any) => u.isFollowing === true)).toBe(true);
    });

    it("should show followed users at the end in suggested users, and show all when all are followed", async () => {
      const allOtherUsers = await User.find({ _id: { $ne: currentUserId } });
      expect(allOtherUsers.length).toBe(3);

      // Follow 1 user out of 3
      await Follow.create({
        follower: currentUserId,
        following: allOtherUsers[0]._id,
      });

      let suggestions = await getSuggestedUsers(currentUserId);
      expect(suggestions.data.length).toBe(3);
      // First 2 must be unfollowed
      expect(suggestions.data[0].isFollowing).toBe(false);
      expect(suggestions.data[1].isFollowing).toBe(false);
      // Last must be followed
      expect(suggestions.data[2].isFollowing).toBe(true);
      expect(suggestions.data[2]._id).toBe(allOtherUsers[0]._id.toString());

      // Now follow the remaining 2 users so all are followed
      await Follow.create([
        { follower: currentUserId, following: allOtherUsers[1]._id },
        { follower: currentUserId, following: allOtherUsers[2]._id },
      ]);

      suggestions = await getSuggestedUsers(currentUserId);
      expect(suggestions.data.length).toBe(3);
      expect(suggestions.data.every((u) => u.isFollowing === true)).toBe(true);
    });

    it("should verify explain('executionStats') on prefix vs unanchored substring query", async () => {
      // Anchored prefix query
      const prefixExplain: any = await User.find({
        username: { $regex: "^yugen", $options: "i" },
      }).explain("executionStats");

      expect(prefixExplain.executionStats).toBeDefined();
      expect(prefixExplain.executionStats.totalDocsExamined).toBeLessThanOrEqual(
        prefixExplain.executionStats.totalKeysExamined + 2
      );

      // Unanchored substring query
      const substringExplain: any = await User.find({
        username: { $regex: "yugen", $options: "i" },
      }).explain("executionStats");

      expect(substringExplain.executionStats).toBeDefined();
    });
  });

  describe("2. Post Search & Text Index Optimization", () => {
    let authorId: any;

    beforeEach(async () => {
      const author = await User.create({
        username: "author_user",
        email: "author@test.com",
        password: "password123",
      });
      authorId = author._id;

      await Post.create([
        {
          author: authorId,
          content: "Learn NodeJS backend architecture and performance optimization",
        },
        {
          author: authorId,
          content: "Building real-time features with WebSockets and Redis",
        },
        {
          author: authorId,
          content: "Random lifestyle post without technical keywords",
        },
      ]);
    });

    it("should find posts via text index search", async () => {
      const results = await searchPostsService("NodeJS");

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content).toContain("NodeJS");
    });

    it("should fallback to partial substring search when exact word doesn't match", async () => {
      // "WebSock" is a partial substring that text indexing tokenization may not hit as a whole word
      const results = await searchPostsService("WebSock");

      expect(results.length).toBe(1);
      expect(results[0].content).toContain("WebSockets");
    });

    it("should verify explain('executionStats') uses TEXT_MATCH stage on text index", async () => {
      const textExplain: any = await Post.find({
        $text: { $search: "architecture" },
      }).explain("executionStats");

      const stats = textExplain.executionStats;
      const winningPlan = textExplain.queryPlanner?.winningPlan;

      expect(stats).toBeDefined();
      expect(stats.nReturned).toBe(1);

      // Verify the winning plan used text index (TEXT_MATCH stage or TEXT stage)
      const stage = winningPlan?.stage || winningPlan?.inputStage?.stage;
      expect(["TEXT_MATCH", "TEXT", "FETCH"]).toContain(stage);
    });
  });
});
