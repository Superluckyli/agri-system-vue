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
// 会话列表 每条会话中有未读消息数量，进行渲染
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

// 当前用户ID
const currentUserId = computed(() => Number(authStore.user?.userId || 0))

// 过滤后的用户
const filteredUsers = computed(() => {
  // 获取用户关键词
  const keyword = userKeyword.value.trim().toLowerCase()
  if (!keyword) {
    // 如果没有关键词，返回所有用户
    return availableUsers.value
  }
  // 过滤用户
  return availableUsers.value.filter((user) => {
    const username = user.username?.toLowerCase() || ''
    const realName = user.realName?.toLowerCase() || ''
    return username.includes(keyword) || realName.includes(keyword)
  })
})

// 激活的会话
const activeConversation = computed(() =>
  conversationList.value.find((item) => item.conversationId === activeConversationId.value) ?? null,
)

// WebSocket状态标签
const socketStatusLabel = computed(() => {
  if (socketStatus.value === 'connected') return '实时已连接'
  if (socketStatus.value === 'connecting') return '连接中'
  if (socketStatus.value === 'reconnecting') return '重连中'
  return '未连接'
})


// 构建WebSocket URL
// 构建 WebSocket 连接地址（带上 Token 鉴权参数）
// 构建 WebSocket 连接地址（带上 Token 鉴权参数）
function buildChatWsUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/api/ws/chat?token=${encodeURIComponent(token)}`
}

// 重连后同步数据
async function resyncAfterReconnect() {
  // 加载会话
  await loadConversations()
  // 如果有激活的会话
  if (activeConversationId.value != null) {
    // 加载消息
    await loadMessages(activeConversationId.value)
    try {
      // 更新已读状态
      await markChatConversationRead(activeConversationId.value)
      // 更新会话列表
      conversationList.value = markConversationAsRead(conversationList.value, activeConversationId.value)
    } catch {
      ElMessage.error('更新已读状态失败')
    }
  } else if (conversationList.value.length > 0) {
    await openConversation(conversationList.value[0]!, true)
  }
}

// 调度重连
function scheduleReconnect() {
  if (!authStore.token) {
    socketStatus.value = 'disconnected'
    return
  }
  if (reconnectTimer != null) {
    return
  }
  // 如果重试次数过多
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    socketStatus.value = 'disconnected'
    ElMessage.error('聊天连接已断开，请重新登录后重试')
    return
  }
  socketStatus.value = 'reconnecting'

  //实现了一套带指数退避算法的重连机制。如果断开，尝试5次重连，且间隔时间会逐渐增加（2s, 4s, 8s
  // 计算重试延迟
  const delay = Math.min(2000 * (reconnectAttempts + 1), 10000)
  // 增加重试次数
  reconnectAttempts += 1
  // 设置定时器
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    // 尝试重连
    connectSocket()
  }, delay)
}


// 加载用户列表
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

// 加载会话列表
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

// 加载消息列表
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

// 打开会话
async function openConversation(conversation: ChatConversationSummary, shouldMarkRead = true) {
  // 设置当前会话ID
  activeConversationId.value = conversation.conversationId
  await loadMessages(conversation.conversationId)
  // 如果需要标记已读
  if (shouldMarkRead) {
    try {
      // 调用接口更新已读状态，将信息标记为已读
      await markChatConversationRead(conversation.conversationId)
    } catch {
      ElMessage.error('更新已读状态失败')
    }
  }
  // 更新会话列表
  conversationList.value = markConversationAsRead(conversationList.value, conversation.conversationId)
}

// 开始会话
async function startConversation(user: ChatUser) {
  try {
    // 创建或获取会话
    const conversation = await createOrGetDirectConversation(user.userId)
    conversationList.value = upsertConversationSummary(conversationList.value, conversation)
    // 清空搜索框
    userKeyword.value = ''

    // 点击窗口打开会话
    await openConversation(conversation, false)
  } catch {
    ElMessage.error('创建会话失败')
  }
}

// 连接WebSocket
function connectSocket() {
  // 获取token
  const token = authStore.token
  if (!token) return
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  socketStatus.value = socketStatus.value === 'connected' ? 'connected' : 'connecting'
  // 浏览器原生 WebSocket 构造函数
  socket = new WebSocket(buildChatWsUrl(token))


  socket.onopen = async () => {
    const shouldResync = reconnectAttempts > 0
    reconnectAttempts = 0
    socketStatus.value = 'connected'
    if (shouldResync) {
      await resyncAfterReconnect() // 断线重连后，重新拉取离线期间的消息
    }
  }

  // 前端接收后端的消息
  socket.onmessage = async (event) => {
    // 解析消息
    const envelope = JSON.parse(event.data) as ChatWsEnvelope<any>

    // 消息类型
    if (envelope.type === 'chat.message') {
      const message = envelope.payload as ChatMessage
      // 更新会话列表
      conversationList.value = applyIncomingMessage(
        conversationList.value,
        message,
        activeConversationId.value,
        currentUserId.value,
      )

      // 如果是当前会话
      if (activeConversationId.value === message.conversationId) {
        // 添加消息
        activeMessages.value = appendMessage(activeMessages.value, message)
        // 如果是对方发来的消息
        if (message.senderId !== currentUserId.value) {
          try {
            // 标记已读
            await markChatConversationRead(message.conversationId)
            // 更新会话列表,将未读消息数量置为0,将最后一条消息置为已读
            conversationList.value = markConversationAsRead(conversationList.value, message.conversationId)
          } catch {
            ElMessage.error('更新已读状态失败')
          }
        }
      }
      return
    }

    // 会话更新通知
    if (envelope.type === 'chat.conversation.update') {
      const summary = envelope.payload as ChatConversationSummary
      conversationList.value = upsertConversationSummary(conversationList.value, summary)
      return
    }

    // 已读同步通知
    if (envelope.type === 'chat.read.sync') {
      // 获取会话ID
      const conversationId = Number(envelope.payload?.conversationId || 0)
      if (conversationId > 0) {
        // 更新会话列表,将未读消息数量置为0,将最后一条消息置为已读
        conversationList.value = markConversationAsRead(conversationList.value, conversationId)
      }
      return
    }

    // 错误通知
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

// 断开 WebSocket 连接
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

// 客户端向服务器发送消息
function sendMessage() {
  const content = draftText.value.trim()
  if (!content) return
  if (!activeConversationId.value) {
    ElMessage.warning('请先选择会话')
    return
  }
  // 必须确保连接已建立且已开启
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    ElMessage.warning('聊天连接未建立')
    return
  }

  // 通过长连接发送 JSON 信封包
  socket.send(JSON.stringify({
    type: 'chat.send',
    payload: {
      conversationId: activeConversationId.value,
      content,
    },
  }))
  draftText.value = ''
}

// 页面加载时，加载用户列表和会话列表，并连接 WebSocket
onMounted(async () => {
  await Promise.all([loadUsers(), loadConversations()])
  connectSocket()
  if (conversationList.value.length > 0) {
    await openConversation(conversationList.value[0]!, true)
  }
})

// 页面卸载时，断开 WebSocket 连接
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
