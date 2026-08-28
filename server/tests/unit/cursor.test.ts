import { encodeCursor, decodeCursor } from "../../src/utils/cursor";

describe("Cursor Utility", () => {
  describe("encodeCursor", () => {
    it("should encode cursor data into a string", () => {
      const data = {
        createdAt: "2026-08-28T10:00:00.000Z",
        id: "507f1f77bcf86cd799439011",
      };

      const cursor = encodeCursor(data);

      expect(typeof cursor).toBe("string");
      expect(cursor.length).toBeGreaterThan(0);
    });
  });

  describe("decodeCursor", () => {
    it("should decode a valid cursor back to the original data", () => {
      const originalData = {
        createdAt: "2026-08-28T10:00:00.000Z",
        id: "507f1f77bcf86cd799439011",
      };

      const cursor = encodeCursor(originalData);
      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(originalData);
    });

    it("should return null for an invalid cursor", () => {
      const decoded = decodeCursor("this-is-not-a-valid-cursor");

      expect(decoded).toBeNull();
    });
  });

  it("should preserve different cursor values correctly", () => {
    const first = {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "111111111111111111111111",
    };

    const second = {
      createdAt: "2026-12-31T23:59:59.000Z",
      id: "222222222222222222222222",
    };

    expect(decodeCursor(encodeCursor(first))).toEqual(first);
    expect(decodeCursor(encodeCursor(second))).toEqual(second);
  });
});
