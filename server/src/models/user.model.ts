import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  username?: string;
  usernameLower?: string;
  nameLower?: string;
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
    usernameLower: { type: String, lowercase: true, trim: true },
    nameLower: { type: String, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    bio: { type: String, default: "" },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.index({ usernameLower: 1 });
UserSchema.index({ nameLower: 1 });

UserSchema.pre("save", function () {
  if (this.isModified("username")) {
    this.usernameLower = this.username ? this.username.toLowerCase() : "";
  }
  if (this.isModified("name")) {
    this.nameLower = this.name ? this.name.toLowerCase() : "";
  }
});

UserSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as any;
  if (update) {
    if (update.username !== undefined) {
      update.usernameLower = update.username ? update.username.toLowerCase() : "";
    }
    if (update.name !== undefined) {
      update.nameLower = update.name ? update.name.toLowerCase() : "";
    }
    if (update.$set) {
      if (update.$set.username !== undefined) {
        update.$set.usernameLower = update.$set.username ? update.$set.username.toLowerCase() : "";
      }
      if (update.$set.name !== undefined) {
        update.$set.nameLower = update.$set.name ? update.$set.name.toLowerCase() : "";
      }
    }
  }
});

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
