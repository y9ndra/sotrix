import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .optional(),
  bio: z
    .string()
    .max(160, "Bio cannot exceed 160 characters")
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
