import mongoose, { Schema, Document } from "mongoose";

export interface IEmailOtp extends Document {
  userId: mongoose.Types.ObjectId;
  targetEmail: string;
  otpHash: string;
  attempts: number;
  lastSentAt: Date;
  createdAt: Date;
}

const EmailOtpSchema = new Schema<IEmailOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetEmail: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, expires: 900 }, // Expire after 15 minutes
  },
  { timestamps: false }
);

EmailOtpSchema.index({ userId: 1, targetEmail: 1 });

const EmailOtp = mongoose.model<IEmailOtp>("EmailOtp", EmailOtpSchema);

export default EmailOtp;
