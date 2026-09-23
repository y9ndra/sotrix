import { Request, Response } from "express";
import { notFoundHandler } from "../../src/middleware/notFoundHandler";

describe("notFoundHandler middleware", () => {
  it("should return JSON 404 response when client accepts json", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/unknown-endpoint",
      headers: {
        accept: "application/json",
      },
      accepts: jest.fn().mockImplementation((type: string) => {
        if (type === "json") return "json";
        return false;
      }),
      xhr: false,
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Route GET /api/unknown-endpoint not found",
    });
  });

  it("should return HTML 404 response when browser visits endpoint", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/invalid-route",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      accepts: jest.fn().mockImplementation((type: string) => {
        if (type === "html") return "html";
        return false;
      }),
      xhr: false,
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.type).toHaveBeenCalledWith("html");
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("endpoint not found")
    );
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("/api/invalid-route")
    );
  });
});
