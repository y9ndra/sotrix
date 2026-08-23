import type { User } from "./user.types";

export interface Notification {
  _id: string;
  recipient: string;
  actor: User;
  type: "like" | "comment" | "follow";
  post?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}
