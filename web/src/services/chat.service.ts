import api from "./api";
import type { Conversation, MessagesResponse } from "../types/chat.types";

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await api.get("/conversations");
  return response.data.data;
};

export const getConversation = async (id: string): Promise<Conversation> => {
  const response = await api.get(`/conversations/${id}`);
  return response.data.data;
};

export const getOrCreateConversation = async (
  participantId: string
): Promise<Conversation> => {
  const response = await api.post("/conversations", { participantId });
  return response.data.data;
};

export const getMessages = async (
  conversationId: string,
  cursor?: string,
  limit: number = 20
): Promise<MessagesResponse> => {
  const response = await api.get(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit },
  });
  return response.data;
};

export const markConversationAsRead = async (
  id: string
): Promise<Conversation> => {
  const response = await api.patch(`/conversations/${id}/read`);
  return response.data.data;
};
