import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Set environment variables immediately for module load time
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "super123secretkey8124yugisupersecret";
process.env.JWT_ACCESS_SECRET = "super123accesssecretkey8124yugisupersecret";
process.env.JWT_REFRESH_SECRET = "super123refreshsecretkey8124yugisupersecret";

// Mock Redis configuration and client to avoid side effects
jest.mock("../src/config/redis", () => {
  return {
    __esModule: true,
    default: {
      connect: jest.fn().mockResolvedValue(null),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(null),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(null),
    },
    connectRedis: jest.fn().mockResolvedValue(null),
  };
});

jest.mock("redis", () => {
  return {
    createClient: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(null),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(null),
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue(null),
      };
    }),
  };
});

// Mock BullMQ queues and workers
jest.mock("bullmq", () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
        close: jest.fn().mockResolvedValue(null),
      };
    }),
    Worker: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(null),
      };
    }),
  };
});

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      info: jest.fn().mockResolvedValue("redis_version:6.0.0"),
      quit: jest.fn().mockResolvedValue("OK"),
    };
  });
});

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory mongodb
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Override environment variables for testing
  process.env.DATABASE_URL = mongoUri;

  // Establish connection
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  // Clean all collections after each test for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Close database connections and stop memory server
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
