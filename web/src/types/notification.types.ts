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

export interface NotificationPost {
  _id: string;
  content?: string;
  imageUrl?: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  actor: NotificationActor;
  type: NotificationType;
  post?: string | NotificationPost | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

