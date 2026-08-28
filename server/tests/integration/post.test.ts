import request from "supertest";
import app from "../../src/app";

describe("Post API Integration Tests", () => {
  const createTestUser = async (username: string, email: string) => {
    const userData = {
      username,
      email,
      password: "password123",
    };

    await request(app)
      .post("/api/auth/signup")
      .send(userData);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: email,
        password: "password123",
      });

    return {
      token: loginResponse.body.token,
      user: loginResponse.body.user,
    };
  };

  const createTestPost = async (token: string, content: string) => {
    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content });

    return response.body.data;
  };

  describe("POST /api/posts", () => {
    it("should create a post for an authenticated user", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");

      const response = await request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          content: "Hello from Post integration test",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("_id");
      expect(response.body.data.content).toBe(
        "Hello from Post integration test"
      );
    });

    it("should reject post creation without authentication", async () => {
      const response = await request(app)
        .post("/api/posts")
        .send({
          content: "Unauthorized post",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/posts/:id", () => {
    it("should return a post by ID", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const post = await createTestPost(userA.token, "Hello from Post integration test");

      const response = await request(app)
        .get(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(post._id);
      expect(response.body.data.content).toBe(
        "Hello from Post integration test"
      );
    });

    it("should return 404 for a non-existing post", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const fakePostId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .get(`/api/posts/${fakePostId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/posts/:id", () => {
    it("should allow the owner to update their post", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const post = await createTestPost(userA.token, "Hello from Post integration test");

      const response = await request(app)
        .patch(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          content: "Updated integration test post",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(
        "Updated integration test post"
      );
    });

    it("should reject update from another user", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const post = await createTestPost(userA.token, "Hello from Post integration test");
      const userB = await createTestUser("postbuser", "postb@test.com");

      const response = await request(app)
        .patch(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          content: "User B trying to edit User A post",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("should reject deletion from another user", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const post = await createTestPost(userA.token, "Hello from Post integration test");
      const userB = await createTestUser("postbuser", "postb@test.com");

      const response = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(response.status).toBe(403);
    });

    it("should allow the owner to delete their post", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const post = await createTestPost(userA.token, "Hello from Post integration test");

      const response = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Post deleted successfully");
    });

    it("should return 404 when deleting an already deleted post", async () => {
      const userA = await createTestUser("postauser", "posta@test.com");
      const post = await createTestPost(userA.token, "Hello from Post integration test");

      // First delete
      await request(app)
        .delete(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      // Second delete
      const response = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(404);
    });
  });
});
