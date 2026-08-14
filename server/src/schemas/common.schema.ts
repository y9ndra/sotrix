import { z } from "zod";

// Validates 24-character hexadecimal MongoDB ObjectIds
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const postIdParamSchema = z.object({
  postId: objectIdSchema,
});

export const commentIdParamSchema = z.object({
  id: objectIdSchema,
});

export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),
  cursor: z.string().optional(),
});

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty")
    .max(50, "Search query is too long"),
});
