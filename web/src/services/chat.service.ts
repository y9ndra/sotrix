import api from "./api";
import type { Conversation, MessagesResponse, ChatMessage } from "../types/chat.types";

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
  limit: number = 30
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

export const editMessage = async (
  conversationId: string,
  messageId: string,
  content: string
): Promise<ChatMessage> => {
  const response = await api.patch(
    `/conversations/${conversationId}/messages/${messageId}`,
    { content }
  );
  return response.data.data;
};

export const deleteMessage = async (
  conversationId: string,
  messageId: string,
  mode: "for_me" | "for_everyone" = "for_everyone"
): Promise<{ conversationId: string; messageId: string; mode: string }> => {
  const response = await api.delete(
    `/conversations/${conversationId}/messages/${messageId}`,
    { params: { mode } }
  );
  return response.data.data;
};

export const batchDeleteMessages = async (
  conversationId: string,
  messageIds: string[],
  mode: "for_me" | "for_everyone" = "for_everyone"
): Promise<{ conversationId: string; messageIds: string[]; mode: string }> => {
  const response = await api.post(
    `/conversations/${conversationId}/messages/batch-delete`,
    { messageIds, mode }
  );
  return response.data.data;
};

export const sendMessageApi = async (
  conversationId: string,
  content: string,
  replyToId?: string
): Promise<ChatMessage> => {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    content,
    replyToId,
  });
  return response.data.data;
};


