import { describe, expect, it } from 'vitest'

import {
  appendMessage,
  applyIncomingMessage,
  formatChatTimestamp,
  markConversationAsRead,
  upsertConversationSummary,
} from '../chatShared'

describe('upsertConversationSummary', () => {
  it('adds a new conversation and sorts by lastMessageAt descending', () => {
    const list = [
      { conversationId: 2, lastMessageAt: '2026-03-19T09:00:00', unreadCount: 0 },
    ]

    expect(
      upsertConversationSummary(list as any, {
        conversationId: 1,
        lastMessageAt: '2026-03-19T10:00:00',
        unreadCount: 0,
      } as any),
    ).toMatchObject([
      { conversationId: 1 },
      { conversationId: 2 },
    ])
  })

  it('replaces an existing conversation summary in place by id', () => {
    const list = [
      { conversationId: 1, lastMessagePreview: 'old', unreadCount: 1 },
    ]

    expect(
      upsertConversationSummary(list as any, {
        conversationId: 1,
        lastMessagePreview: 'new',
        unreadCount: 3,
      } as any),
    ).toEqual([
      { conversationId: 1, lastMessagePreview: 'new', unreadCount: 3 },
    ])
  })
})

describe('applyIncomingMessage', () => {
  it('increments unread count for an inactive conversation when the message is from another user', () => {
    const list = [
      { conversationId: 1, unreadCount: 0, lastMessagePreview: '', lastMessageAt: '' },
    ]

    expect(
      applyIncomingMessage(list as any, {
        conversationId: 1,
        senderId: 2,
        content: 'hello',
        createdAt: '2026-03-19T10:00:00',
      } as any, 99, 1),
    ).toEqual([
      {
        conversationId: 1,
        unreadCount: 1,
        lastMessagePreview: 'hello',
        lastMessageAt: '2026-03-19T10:00:00',
      },
    ])
  })

  it('does not increment unread count when the conversation is active', () => {
    const list = [
      { conversationId: 1, unreadCount: 0, lastMessagePreview: '', lastMessageAt: '' },
    ]

    const result = applyIncomingMessage(list as any, {
        conversationId: 1,
        senderId: 2,
        content: 'hello',
        createdAt: '2026-03-19T10:00:00',
      } as any, 1, 1)

    expect(result[0]).toMatchObject({ unreadCount: 0 })
  })
})

describe('markConversationAsRead', () => {
  it('resets the unread count for the specified conversation', () => {
    const list = [
      { conversationId: 1, unreadCount: 2 },
      { conversationId: 2, unreadCount: 4 },
    ]

    expect(markConversationAsRead(list as any, 2)).toEqual([
      { conversationId: 1, unreadCount: 2 },
      { conversationId: 2, unreadCount: 0 },
    ])
  })
})

describe('appendMessage', () => {
  it('appends a message and sorts messages ascending by messageId', () => {
    const list = [
      { messageId: 2, content: 'second' },
    ]

    expect(
      appendMessage(list as any, { messageId: 1, content: 'first' } as any),
    ).toEqual([
      { messageId: 1, content: 'first' },
      { messageId: 2, content: 'second' },
    ])
  })

  it('does not duplicate an existing message id', () => {
    const list = [
      { messageId: 1, content: 'first' },
    ]

    expect(
      appendMessage(list as any, { messageId: 1, content: 'first' } as any),
    ).toEqual([
      { messageId: 1, content: 'first' },
    ])
  })
})

describe('formatChatTimestamp', () => {
  it('formats local datetime strings to yyyy-mm-dd hh:mm:ss', () => {
    expect(formatChatTimestamp('2026-03-19T14:23:21.2950564')).toBe('2026-03-19 14:23:21')
  })

  it('returns an empty string for empty values', () => {
    expect(formatChatTimestamp()).toBe('')
  })
})
