import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .max(50, "Display name must not exceed 50 characters")
    .optional(),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters"),

  email: z
    .string()
    .email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or username is required"),

  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.string().trim().email("Invalid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  otp: z.string().trim().regex(/^\d{6}$/, "Reset code must be exactly 6 digits"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

