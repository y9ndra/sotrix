export type NotificationType =
  | "like"
  | "comment"
  | "follow";

export interface NotificationActor {
  _id: string;
  name?: string;
  username: string;
  email?: string;
  profilePicUrl?: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  actor: NotificationActor;
  type: NotificationType;
  post?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}
