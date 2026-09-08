export interface ChatUser {
  _id: string;
  name?: string;
  username: string;
  profilePicUrl?: string;
  isFollowing?: boolean;
}

export interface Conversation {
  _id: string;
  participants: ChatUser[];
  participantKey: string;
  lastMessage?: {
    content: string;
    sender: string | ChatUser;
    createdAt: string;
  };
  hasUnread?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: ChatUser;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesResponse {
  success: boolean;
  data: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}
