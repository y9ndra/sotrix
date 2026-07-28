export interface PostCursor {
  createdAt: string;
  id: string;
}

export const encodeCursor = (cursor: PostCursor): string => {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
};

export const decodeCursor = (cursor: string): PostCursor | null => {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (
      parsed &&
      typeof parsed.createdAt === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};
