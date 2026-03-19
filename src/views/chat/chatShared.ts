import type { ChatConversationSummary, ChatMessage } from '@/types/chat'

export function formatChatTimestamp(value?: string): string {
  if (!value) {
    return ''
  }
  const normalized = value.replace('T', ' ').replace(/\.\d+$/, '')
  return normalized.length > 19 ? normalized.slice(0, 19) : normalized
}

export function upsertConversationSummary(
  list: ChatConversationSummary[],
  incoming: ChatConversationSummary,
): ChatConversationSummary[] {
  const next = list.filter((item) => item.conversationId !== incoming.conversationId)
  next.push({ ...incoming, unreadCount: incoming.unreadCount ?? 0 })
  return next.sort(compareConversationTimeDesc)
}

export function applyIncomingMessage(
  list: ChatConversationSummary[],
  message: ChatMessage,
  activeConversationId: number | null,
  currentUserId: number,
): ChatConversationSummary[] {
  return list.map((item) => {
    if (item.conversationId !== message.conversationId) {
      return item
    }
    const shouldIncrementUnread = message.senderId !== currentUserId && activeConversationId !== message.conversationId
    return {
      ...item,
      lastMessagePreview: message.content,
      lastMessageAt: message.createdAt,
      unreadCount: shouldIncrementUnread ? Number(item.unreadCount || 0) + 1 : Number(item.unreadCount || 0),
    }
  }).sort(compareConversationTimeDesc)
}

export function markConversationAsRead(
  list: ChatConversationSummary[],
  conversationId: number,
): ChatConversationSummary[] {
  return list.map((item) =>
    item.conversationId === conversationId
      ? { ...item, unreadCount: 0 }
      : item,
  )
}

export function appendMessage(
  list: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  if (list.some((item) => item.messageId === incoming.messageId)) {
    return list
  }
  return [...list, incoming].sort((a, b) => a.messageId - b.messageId)
}

function compareConversationTimeDesc(a: ChatConversationSummary, b: ChatConversationSummary): number {
  const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
  const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
  return bTime - aTime
}
