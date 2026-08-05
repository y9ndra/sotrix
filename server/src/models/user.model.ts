import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, default: "", trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    bio: { type: String, default: "" },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
