<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { createOrGetDirectConversation, listChatConversations, listChatMessages, listChatUsers, markChatConversationRead } from '@/api/chat'
import { useAuthStore } from '@/stores/auth'
import type { ChatConversationSummary, ChatMessage, ChatUser, ChatWsEnvelope } from '@/types/chat'
import {
  appendMessage,
  applyIncomingMessage,
  formatChatTimestamp,
  markConversationAsRead,
  upsertConversationSummary,
} from './chatShared'

defineOptions({ name: 'ChatView' })

const authStore = useAuthStore()

const availableUsers = ref<ChatUser[]>([])
const conversationList = ref<ChatConversationSummary[]>([])
const activeConversationId = ref<number | null>(null)
const activeMessages = ref<ChatMessage[]>([])
const userKeyword = ref('')
const draftText = ref('')
const loadingUsers = ref(false)
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const socketStatus = ref<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')

let socket: WebSocket | null = null
let reconnectTimer: number | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

const currentUserId = computed(() => Number(authStore.user?.userId || 0))

const filteredUsers = computed(() => {
  const keyword = userKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return availableUsers.value
  }
  return availableUsers.value.filter((user) => {
    const username = user.username?.toLowerCase() || ''
    const realName = user.realName?.toLowerCase() || ''
    return username.includes(keyword) || realName.includes(keyword)
  })
})

const activeConversation = computed(() =>
  conversationList.value.find((item) => item.conversationId === activeConversationId.value) ?? null,
)

const socketStatusLabel = computed(() => {
  if (socketStatus.value === 'connected') return '实时已连接'
  if (socketStatus.value === 'connecting') return '连接中'
  if (socketStatus.value === 'reconnecting') return '重连中'
  return '未连接'
})

function buildChatWsUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/api/ws/chat?token=${encodeURIComponent(token)}`
}

async function resyncAfterReconnect() {
  await loadConversations()
  if (activeConversationId.value != null) {
    await loadMessages(activeConversationId.value)
    try {
      await markChatConversationRead(activeConversationId.value)
      conversationList.value = markConversationAsRead(conversationList.value, activeConversationId.value)
    } catch {
      ElMessage.error('更新已读状态失败')
    }
  } else if (conversationList.value.length > 0) {
    await openConversation(conversationList.value[0]!, true)
  }
}

function scheduleReconnect() {
  if (!authStore.token) {
    socketStatus.value = 'disconnected'
    return
  }
  if (reconnectTimer != null) {
    return
  }
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    socketStatus.value = 'disconnected'
    ElMessage.error('聊天连接已断开，请重新登录后重试')
    return
  }

  socketStatus.value = 'reconnecting'
  const delay = Math.min(2000 * (reconnectAttempts + 1), 10000)
  reconnectAttempts += 1
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectSocket()
  }, delay)
}

async function loadUsers() {
  loadingUsers.value = true
  try {
    availableUsers.value = await listChatUsers()
  } catch {
    availableUsers.value = []
  } finally {
    loadingUsers.value = false
  }
}

async function loadConversations() {
  loadingConversations.value = true
  try {
    conversationList.value = await listChatConversations()
  } catch {
    conversationList.value = []
  } finally {
    loadingConversations.value = false
  }
}

async function loadMessages(conversationId: number) {
  loadingMessages.value = true
  try {
    const page = await listChatMessages(conversationId, 1, 100)
    activeMessages.value = [...(page.items || [])].reverse()
  } catch {
    activeMessages.value = []
    ElMessage.error('加载聊天记录失败')
  } finally {
    loadingMessages.value = false
  }
}

async function openConversation(conversation: ChatConversationSummary, shouldMarkRead = true) {
  activeConversationId.value = conversation.conversationId
  await loadMessages(conversation.conversationId)
  if (shouldMarkRead) {
    try {
      await markChatConversationRead(conversation.conversationId)
    } catch {
      ElMessage.error('更新已读状态失败')
    }
  }
  conversationList.value = markConversationAsRead(conversationList.value, conversation.conversationId)
}

async function startConversation(user: ChatUser) {
  try {
    const conversation = await createOrGetDirectConversation(user.userId)
    conversationList.value = upsertConversationSummary(conversationList.value, conversation)
    userKeyword.value = ''
    await openConversation(conversation, false)
  } catch {
    ElMessage.error('创建会话失败')
  }
}

function connectSocket() {
  const token = authStore.token
  if (!token) return

  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  socketStatus.value = socketStatus.value === 'connected' ? 'connected' : 'connecting'
  socket = new WebSocket(buildChatWsUrl(token))

  socket.onopen = async () => {
    const shouldResync = reconnectAttempts > 0
    reconnectAttempts = 0
    socketStatus.value = 'connected'
    if (shouldResync) {
      await resyncAfterReconnect()
    }
  }

  socket.onmessage = async (event) => {
    const envelope = JSON.parse(event.data) as ChatWsEnvelope<any>

    if (envelope.type === 'chat.message') {
      const message = envelope.payload as ChatMessage
      conversationList.value = applyIncomingMessage(
        conversationList.value,
        message,
        activeConversationId.value,
        currentUserId.value,
      )
      if (activeConversationId.value === message.conversationId) {
        activeMessages.value = appendMessage(activeMessages.value, message)
        if (message.senderId !== currentUserId.value) {
          try {
            await markChatConversationRead(message.conversationId)
            conversationList.value = markConversationAsRead(conversationList.value, message.conversationId)
          } catch {
            ElMessage.error('更新已读状态失败')
          }
        }
      }
      return
    }

    if (envelope.type === 'chat.conversation.update') {
      const summary = envelope.payload as ChatConversationSummary
      conversationList.value = upsertConversationSummary(conversationList.value, summary)
      return
    }

    if (envelope.type === 'chat.read.sync') {
      const conversationId = Number(envelope.payload?.conversationId || 0)
      if (conversationId > 0) {
        conversationList.value = markConversationAsRead(conversationList.value, conversationId)
      }
      return
    }

    if (envelope.type === 'chat.error') {
      ElMessage.error(String(envelope.payload?.message || '聊天操作失败'))
    }
  }

  socket.onclose = () => {
    scheduleReconnect()
  }

  socket.onerror = () => {
    if (socketStatus.value !== 'connected') {
      socketStatus.value = 'reconnecting'
    }
  }
}

function disconnectSocket() {
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0
  if (socket) {
    socket.onclose = null
    socket.close()
    socket = null
  }
  socketStatus.value = 'disconnected'
}

function sendMessage() {
  const content = draftText.value.trim()
  if (!content) return
  if (!activeConversationId.value) {
    ElMessage.warning('请先选择会话')
    return
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    ElMessage.warning('聊天连接未建立')
    return
  }

  socket.send(JSON.stringify({
    type: 'chat.send',
    payload: {
      conversationId: activeConversationId.value,
      content,
    },
  }))
  draftText.value = ''
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadConversations()])
  connectSocket()
  if (conversationList.value.length > 0) {
    await openConversation(conversationList.value[0]!, true)
  }
})

onUnmounted(() => {
  disconnectSocket()
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-left">
      <div class="chat-card">
        <div class="chat-card__title">发起聊天</div>
        <el-input v-model="userKeyword" placeholder="搜索用户名或姓名" clearable />
        <el-scrollbar height="180px" class="user-list">
          <div v-if="loadingUsers" class="chat-empty">加载用户中...</div>
          <button
            v-for="user in filteredUsers"
            :key="user.userId"
            type="button"
            class="user-item"
            @click="startConversation(user)"
          >
            <span class="user-item__name">{{ user.realName || user.username }}</span>
            <span class="user-item__meta">{{ user.username }}</span>
          </button>
        </el-scrollbar>
      </div>

      <div class="chat-card chat-card--fill">
        <div class="chat-card__header">
          <div class="chat-card__title">会话列表</div>
          <el-tag size="small" :type="socketStatus === 'connected' ? 'success' : 'warning'">
            {{ socketStatusLabel }}
          </el-tag>
        </div>
        <el-scrollbar height="100%" class="conversation-list">
          <div v-if="loadingConversations" class="chat-empty">加载会话中...</div>
          <div v-else-if="conversationList.length === 0" class="chat-empty">暂无会话</div>
          <button
            v-for="conversation in conversationList"
            :key="conversation.conversationId"
            type="button"
            class="conversation-item"
            :class="{ 'is-active': conversation.conversationId === activeConversationId }"
            @click="openConversation(conversation)"
          >
            <div class="conversation-item__top">
              <span class="conversation-item__name">{{ conversation.peerDisplayName || conversation.peerUsername }}</span>
              <span class="conversation-item__time">{{ formatChatTimestamp(conversation.lastMessageAt) }}</span>
            </div>
            <div class="conversation-item__bottom">
              <span class="conversation-item__preview">{{ conversation.lastMessagePreview || '暂无消息' }}</span>
              <el-badge :value="conversation.unreadCount || 0" :hidden="!conversation.unreadCount" />
            </div>
          </button>
        </el-scrollbar>
      </div>
    </div>

    <div class="chat-right">
      <div v-if="activeConversation" class="chat-window">
        <div class="chat-window__header">
          <div class="chat-window__title">{{ activeConversation.peerDisplayName || activeConversation.peerUsername }}</div>
        </div>
        <el-scrollbar class="chat-window__body">
          <div v-if="loadingMessages" class="chat-empty">加载消息中...</div>
          <div v-else-if="activeMessages.length === 0" class="chat-empty">还没有消息，开始聊天吧</div>
          <div
            v-for="message in activeMessages"
            :key="message.messageId"
            class="message-row"
            :class="{ 'is-self': message.senderId === currentUserId }"
          >
            <div class="message-bubble">
              <div class="message-content">{{ message.content }}</div>
              <div class="message-time">{{ formatChatTimestamp(message.createdAt) }}</div>
            </div>
          </div>
        </el-scrollbar>
        <div class="chat-window__footer">
          <el-input
            v-model="draftText"
            type="textarea"
            :rows="3"
            placeholder="输入消息后回车发送"
            @keydown.enter.prevent="sendMessage"
          />
          <div class="chat-window__actions">
            <el-button type="primary" @click="sendMessage">发送</el-button>
          </div>
        </div>
      </div>
      <div v-else class="chat-empty chat-empty--full">请选择用户开始聊天</div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  height: calc(100vh - 120px);
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  padding: 20px;
  background: #f5f7fa;
}

.chat-left,
.chat-right {
  min-height: 0;
}

.chat-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-card,
.chat-window,
.chat-empty--full {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.chat-card {
  padding: 16px;
}

.chat-card--fill {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chat-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.user-list,
.conversation-list {
  margin-top: 12px;
}

.user-item,
.conversation-item {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  padding: 10px 12px;
}

.user-item:hover,
.conversation-item:hover,
.conversation-item.is-active {
  background: #f0f9eb;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.user-item__name,
.conversation-item__name {
  font-weight: 600;
  color: #303133;
}

.user-item__meta,
.conversation-item__time,
.message-time {
  font-size: 12px;
  color: #909399;
}

.conversation-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.conversation-item__top,
.conversation-item__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.conversation-item__preview {
  color: #606266;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-window__header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.chat-window__title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.chat-window__body {
  flex: 1;
  padding: 16px 20px;
}

.chat-window__footer {
  border-top: 1px solid #ebeef5;
  padding: 16px 20px;
}

.chat-window__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.is-self {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f4f4f5;
}

.message-row.is-self .message-bubble {
  background: #d9f2d9;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
}

.message-time {
  margin-top: 6px;
  text-align: right;
}

.chat-empty,
.chat-empty--full {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.chat-empty--full {
  height: 100%;
}
</style>
