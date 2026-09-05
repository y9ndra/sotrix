import User from "../../src/models/user.model";
import Post from "../../src/models/post.model";
import { searchUsersService } from "../../src/services/user.service";
import { searchPostsService } from "../../src/services/post.service";

describe("Day 37 — Text Search & Index Optimization Tests", () => {
  beforeAll(async () => {
    // Ensure indexes are built in the test database
    await User.syncIndexes();
    await Post.syncIndexes();
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
