import request from "supertest";
import app from "../../src/app";
import User from "../../src/models/user.model";

const signupTestUser = async () => {
  const userData = {
    username: "yugen",
    email: "yugen@test.com",
    password: "password123",
  };

  await request(app)
    .post("/api/auth/signup")
    .send(userData);

  return userData;
};

describe("Auth API", () => {
  describe("POST /api/auth/signup", () => {
    it("should create a new user successfully", async () => {
      const userData = {
        username: "yugen",
        email: "yugen@test.com",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(userData);

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty(
        "message",
        "User registered successfully"
      );

      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);

      const userInDb = await User.findOne({
        email: userData.email,
      });

      expect(userInDb).not.toBeNull();
      expect(userInDb?.password).not.toBe(userData.password);
    });

    it("should reject duplicate email or username", async () => {
      const userData = {
        username: "yugen",
        email: "yugen@test.com",
        password: "password123",
      };

      await request(app)
        .post("/api/auth/signup")
        .send(userData);

      const response = await request(app)
        .post("/api/auth/signup")
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("already exists");
    });

    it("should reject invalid signup data", async () => {
      const invalidUser = {
        username: "ab",
        email: "not-an-email",
        password: "123",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(invalidUser);

      expect(response.status).toBe(400);
    });

    it("should reject missing required fields", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          username: "yugen",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const userData = await signupTestUser();

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body).toHaveProperty("token");

      expect(typeof response.body.token).toBe("string");

      expect(response.body.token.length).toBeGreaterThan(0);

      const cookies = response.headers["set-cookie"];

      expect(cookies).toBeDefined();
      expect(cookies?.length).toBeGreaterThan(0);
      expect(cookies?.[0]).toContain("refreshToken=");
      expect(cookies?.[0]).toContain("HttpOnly");
    });

    it("should login successfully using username", async () => {
      const userData = await signupTestUser();

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: userData.username,
          password: userData.password,
        });

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body).toHaveProperty("token");
    });

    it("should reject login with incorrect password", async () => {
      const userData = await signupTestUser();

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: userData.email,
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);

      expect(response.body.message).toBe("Invalid password");
    });

    it("should reject login for non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "unknown@test.com",
          password: "password123",
        });

      expect(response.status).toBe(401);

      expect(response.body.message).toContain("does not exist");
    });

    it("should reject login when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "yugen@test.com",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should reject request without an access token", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    it("should reject request with an invalid access token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });

    it("should return the authenticated user's profile", async () => {
      const userData = await signupTestUser();

      // Login and get a real access token
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: userData.email,
          password: userData.password,
        });

      const accessToken = loginResponse.body.token;

      // Access protected route
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should issue a new access token using a valid refresh token", async () => {
      const userData = await signupTestUser();

      const agent = request.agent(app);

      // Login → receives refresh token cookie
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({
          identifier: userData.email,
          password: userData.password,
        });

      expect(loginResponse.status).toBe(200);

      // Refresh → cookie is automatically sent
      const refreshResponse = await agent.post("/api/auth/refresh");

      expect(refreshResponse.status).toBe(200);

      expect(refreshResponse.body.success).toBe(true);

      expect(refreshResponse.body).toHaveProperty("token");

      expect(typeof refreshResponse.body.token).toBe("string");
    });

    it("should reject refresh when no refresh token is provided", async () => {
      const response = await request(app)
        .post("/api/auth/refresh");

      expect(response.status).toBe(401);
    });

    it("should invalidate the old refresh token after rotation", async () => {
      const userData = await signupTestUser();

      const agent = request.agent(app);

      // Login
      const loginResponse = await agent
        .post("/api/auth/login")
        .send({
          identifier: userData.email,
          password: userData.password,
        });

      const oldCookies = loginResponse.headers["set-cookie"];

      expect(oldCookies).toBeDefined();

      // Use old refresh token → rotation happens
      const refreshResponse = await agent
        .post("/api/auth/refresh");

      expect(refreshResponse.status).toBe(200);

      // Try the OLD refresh token again manually
      const replayResponse = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", oldCookies);

      expect(replayResponse.status).toBe(401);
    });
  });
});
