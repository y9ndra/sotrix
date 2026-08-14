import { z } from "zod";

export const createPostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Post content is required and cannot be empty")
    .max(500, "Post content cannot exceed 500 characters"),
});

export const updatePostSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Post content cannot be empty")
      .max(500, "Post content cannot exceed 500 characters")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided",
    }
  );

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
