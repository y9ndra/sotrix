import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content is required and cannot be empty")
    .max(500, "Comment content cannot exceed 500 characters"),
});

export const updateCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Comment content cannot be empty")
      .max(500, "Comment content cannot exceed 500 characters")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided",
    }
  );

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
