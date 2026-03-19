export interface ChatUser {
  userId: number
  username: string
  realName?: string
  deptName?: string
}

export interface ChatConversationSummary {
  conversationId: number
  peerUserId: number
  peerUsername?: string
  peerDisplayName?: string
  lastMessagePreview?: string
  lastMessageAt?: string
  unreadCount?: number
}

export interface ChatMessage {
  messageId: number
  conversationId: number
  senderId: number
  receiverId: number
  content: string
  messageType?: string
  createdAt?: string
}

export interface ChatWsEnvelope<T = unknown> {
  type: string
  payload: T
}
