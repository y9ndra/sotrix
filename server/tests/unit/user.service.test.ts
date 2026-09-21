import mongoose from "mongoose";
import { UserService } from "../../src/services/user.service";
import { IUserRepository } from "../../src/repositories";
import { updateProfileSchema } from "../../src/schemas/user.schema";

class MockUserRepository implements Partial<IUserRepository> {
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

  async findByEmail(email: string, excludeId?: string): Promise<any> {
    for (const [id, user] of this.users.entries()) {
      if (user.email === email && id !== excludeId) {
        return { ...user };
      }
    }
    return null;
  }

  async updateById(id: string, updates: any): Promise<any> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }
}

describe("UserService - Update Profile with Email", () => {
  let mockUserRepo: MockUserRepository;
  let userService: UserService;
  const user1Id = new mongoose.Types.ObjectId().toString();
  const user2Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    mockUserRepo.users.set(user1Id, {
      _id: user1Id,
      name: "User One",
      username: "userone",
      email: "userone@example.com",
      bio: "Hello world",
    });
    mockUserRepo.users.set(user2Id, {
      _id: user2Id,
      name: "User Two",
      username: "usertwo",
      email: "usertwo@example.com",
      bio: "Second user",
    });

    userService = new UserService(mockUserRepo as any, {} as any, {} as any);
  });

  describe("updateUserProfile", () => {
    it("should successfully update user email when it is unique", async () => {
      const updated = await userService.updateUserProfile(user1Id, {
        email: "newemail@example.com",
      });

      expect(updated.email).toBe("newemail@example.com");
      expect(mockUserRepo.users.get(user1Id).email).toBe("newemail@example.com");
    });

    it("should allow keeping the current email for the same user", async () => {
      const updated = await userService.updateUserProfile(user1Id, {
        email: "userone@example.com",
        name: "User One Updated",
      });

      expect(updated.email).toBe("userone@example.com");
      expect(updated.name).toBe("User One Updated");
    });

    it("should normalize email by trimming and lowercasing", async () => {
      const updated = await userService.updateUserProfile(user1Id, {
        email: "  NEWMAIL@EXAMPLE.COM  ",
      });

      expect(updated.email).toBe("newmail@example.com");
    });

    it("should throw an error if the email is already taken by another user", async () => {
      await expect(
        userService.updateUserProfile(user1Id, {
          email: "usertwo@example.com",
        })
      ).rejects.toThrow("Email is already taken");
    });
  });

  describe("updateProfileSchema", () => {
    it("should validate a valid email", () => {
      const result = updateProfileSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject an invalid email address", () => {
      const result = updateProfileSchema.safeParse({
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid email address");
      }
    });

    it("should accept valid updates without email", () => {
      const result = updateProfileSchema.safeParse({
        name: "New Name",
        bio: "New Bio",
      });
      expect(result.success).toBe(true);
    });
  });
});
