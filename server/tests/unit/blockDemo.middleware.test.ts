import { Request, Response } from "express";
import { blockDemoUser } from "../../src/middleware/blockDemo";

describe("blockDemoUser middleware", () => {
  it("should return 403 Forbidden with DEMO_ACCOUNT_RESTRICTED if user is a demo user", () => {
    const req = {
      user: {
        id: "demo-user-id",
        isDemo: true,
      },
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    blockDemoUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: "DEMO_ACCOUNT_RESTRICTED",
      message: "This demo account is view-only. Please create an account to interact.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() if user is not a demo user", () => {
    const req = {
      user: {
        id: "regular-user-id",
        isDemo: false,
      },
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    blockDemoUser(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call next() if req.user is undefined", () => {
    const req = {} as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    blockDemoUser(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
