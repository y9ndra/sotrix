import crypto from "crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import EmailOtp from "../models/email-otp.model";
import User from "../models/user.model";
import Session from "../models/session.model";
import { sendVerificationOtpEmail, sendPasswordResetOtpEmail } from "./email.service";
import { userRepository } from "../repositories";
import { AuthUser } from "../types/auth.types";

/**
 * Generate a random 6-digit numeric OTP and send it to target email
 */
export const generateAndSendOtp = async (
  userId: string,
  targetEmail: string,
  username?: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET" = "EMAIL_VERIFICATION"
): Promise<{ success: boolean; resendCooldownRemaining?: number }> => {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Check existing OTP to enforce 60-second cooldown between requests
  const existingOtp = await EmailOtp.findOne({ userId: userObjectId, type });
  if (existingOtp) {
    const timeSinceLastSent = (Date.now() - new Date(existingOtp.lastSentAt).getTime()) / 1000;
    if (timeSinceLastSent < 60) {
      const waitTime = Math.ceil(60 - timeSinceLastSent);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new code.`);
    }
  }

  // Generate 6-digit random code
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 8);

  // Upsert EmailOtp record with 15-minute expiration
  await EmailOtp.findOneAndUpdate(
    { userId: userObjectId, type },
    {
      targetEmail: normalizedEmail,
      otpHash,
      type,
      attempts: 0,
      lastSentAt: new Date(),
      createdAt: new Date(),
    },
    { upsert: true, returnDocument: "after" }
  );

  // Send the email (or log to dev console)
  if (type === "PASSWORD_RESET") {
    await sendPasswordResetOtpEmail(normalizedEmail, otp, username);
  } else {
    await sendVerificationOtpEmail(normalizedEmail, otp, username);
  }

  return { success: true };
};

/**
 * Verify submitted 6-digit OTP code for email verification
 */
export const verifyOtp = async (
  userId: string,
  otp: string
): Promise<{ success: boolean; user: AuthUser; message: string }> => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const otpRecord = await EmailOtp.findOne({ userId: userObjectId, type: "EMAIL_VERIFICATION" });

  if (!otpRecord) {
    throw new Error("Verification code has expired or was not requested. Please request a new code.");
  }

  if (otpRecord.attempts >= 5) {
    await EmailOtp.deleteOne({ _id: otpRecord._id });
    throw new Error("Too many failed attempts. For security, please request a new verification code.");
  }

  const isMatch = await bcrypt.compare(otp.trim(), otpRecord.otpHash);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = 5 - otpRecord.attempts;
    throw new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  // Find user and update email and verified status
  const user = await User.findById(userObjectId);
  if (!user) {
    throw new Error("User not found");
  }

  // Update email if it was an email update flow
  if (otpRecord.targetEmail && otpRecord.targetEmail !== user.email) {
    user.email = otpRecord.targetEmail;
  }
  user.isEmailVerified = true;
  await user.save();

  // Clean up OTP record
  await EmailOtp.deleteOne({ _id: otpRecord._id });

  return {
    success: true,
    message: "Email verified successfully!",
    user: {
      id: (user._id as any).toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicUrl: user.profilePicUrl,
      profilePicPublicId: user.profilePicPublicId,
      isDemo: user.isDemo,
      isEmailVerified: true,
    },
  };
};

/**
 * Handle user changing email before verification (especially for dummy email recovery)
 */
export const requestEmailUpdate = async (
  userId: string,
  currentPassword: string,
  newEmail: string
): Promise<{ success: boolean; message: string }> => {
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedNewEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userObjectId);
  if (!user) {
    throw new Error("User not found");
  }

  // If user is already verified with this exact email
  if (user.isEmailVerified && user.email === normalizedNewEmail) {
    throw new Error("This email is already verified on your account.");
  }

  // Verify user password for security
  if (!user.isDemo) {
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || "");
    if (!isPasswordValid) {
      throw new Error("Incorrect current password.");
    }
  }

  // Check if new email is taken by any other user
  const existingUserWithEmail = await userRepository.findByEmail(normalizedNewEmail);
  if (existingUserWithEmail && (existingUserWithEmail._id as any).toString() !== userId) {
    throw new Error("This email address is already in use by another account.");
  }

  // Generate and send OTP to the NEW email
  await generateAndSendOtp(userId, normalizedNewEmail, user.username);

  return {
    success: true,
    message: `Verification code sent to ${normalizedNewEmail}`,
  };
};

/**
 * Request password reset OTP email for a user by email or username
 */
export const requestPasswordReset = async (
  identifier: string
): Promise<{ success: boolean; message: string; email?: string }> => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await userRepository.findByEmailOrUsername(normalizedIdentifier);

  // Return standard ambiguous message if user not found to prevent account enumeration
  if (!user) {
    return {
      success: true,
      message: "If an account matches that email or username, a reset code was sent.",
    };
  }

  if (user.isDemo) {
    throw new Error("Password reset is disabled for the demo account.");
  }

  if (!user.email) {
    throw new Error("No email address associated with this account.");
  }

  await generateAndSendOtp(
    (user._id as any).toString(),
    user.email,
    user.username,
    "PASSWORD_RESET"
  );

  return {
    success: true,
    message: `A password reset code has been sent to your email.`,
    email: user.email,
  };
};

/**
 * Verify OTP and reset user's password
 */
export const resetPasswordWithOtp = async (
  identifier: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await userRepository.findByEmailOrUsername(normalizedIdentifier);

  if (!user) {
    throw new Error("Invalid reset request or expired code.");
  }

  if (user.isDemo) {
    throw new Error("Password reset is disabled for the demo account.");
  }

  const otpRecord = await EmailOtp.findOne({
    userId: user._id,
    type: "PASSWORD_RESET",
  });

  if (!otpRecord) {
    throw new Error("Password reset code has expired or was not requested. Please request a new code.");
  }

  if (otpRecord.attempts >= 5) {
    await EmailOtp.deleteOne({ _id: otpRecord._id });
    throw new Error("Too many failed attempts. For security, please request a new reset code.");
  }

  const isMatch = await bcrypt.compare(otp.trim(), otpRecord.otpHash);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = 5 - otpRecord.attempts;
    throw new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  // Update user's password with fresh bcrypt hash
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  // Clean up reset OTP record
  await EmailOtp.deleteOne({ _id: otpRecord._id });

  // Invalidate all active sessions across all devices for security
  await Session.deleteMany({ user: user._id });

  return {
    success: true,
    message: "Password reset successfully! You can now log in with your new password.",
  };
};

