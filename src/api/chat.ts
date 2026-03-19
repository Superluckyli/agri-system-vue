import { get, post } from './http'
import type { PageResult } from '@/types/api'
import type { ChatConversationSummary, ChatMessage, ChatUser } from '@/types/chat'

export function listChatUsers(): Promise<ChatUser[]> {
  return get<ChatUser[]>('/chat/users')
}

export function listChatConversations(): Promise<ChatConversationSummary[]> {
  return get<ChatConversationSummary[]>('/chat/conversations')
}

export function listChatMessages(conversationId: number | string, pageNum = 1, pageSize = 20): Promise<PageResult<ChatMessage>> {
  return get<PageResult<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, {
    params: { pageNum, pageSize },
  })
}

export function createOrGetDirectConversation(targetUserId: number | string): Promise<ChatConversationSummary> {
  return post<ChatConversationSummary>('/chat/conversations/direct', { targetUserId })
}

export function markChatConversationRead(conversationId: number | string): Promise<void> {
  return post<void>(`/chat/conversations/${conversationId}/read`)
}
