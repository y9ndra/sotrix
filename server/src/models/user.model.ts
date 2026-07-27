import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  bio?: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, default: "" },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String, default: "" },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
