<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { DataAnalysis, List, User, SwitchButton } from '@element-plus/icons-vue'

import { useAuthStore } from '@/stores/auth'

interface MenuItem {
  path: string
  label: string
  icon: typeof DataAnalysis
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: '数据看板', icon: DataAnalysis },
  { path: '/system/users', label: '用户管理', icon: User },
  { path: '/tasks', label: '任务管理', icon: List },
]

const activePath = computed(() => route.path)
const displayName = computed(() => authStore.user?.realName || authStore.user?.username || '管理员')

function handleLogout(): void {
  authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <el-container class="app-shell">
    <el-aside width="228px" class="app-shell__aside">
      <div class="brand">
        <h1>Agri System</h1>
        <p>农业运营管理台</p>
      </div>

      <el-menu :default-active="activePath" router class="nav-menu">
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-shell__header">
        <div class="header-meta">
          <span class="header-meta__label">当前用户</span>
          <strong>{{ displayName }}</strong>
        </div>

        <el-button type="danger" plain :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
      </el-header>

      <el-main class="app-shell__main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-shell__aside {
  border-right: 1px solid var(--agri-border);
  background: linear-gradient(180deg, #f3faec, #f8f9f5);
  padding: 14px;
}

.brand {
  padding: 14px 14px 20px;
}

.brand h1 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.3px;
  color: #23422f;
}

.brand p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--agri-text-muted);
}

.nav-menu {
  border: none;
  background: transparent;
}

.app-shell__header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--agri-border);
  background: rgba(252, 253, 250, 0.85);
  backdrop-filter: blur(4px);
}

.header-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.header-meta__label {
  color: var(--agri-text-muted);
  font-size: 13px;
}

.app-shell__main {
  padding: 20px;
}

@media (max-width: 1024px) {
  .app-shell__aside {
    width: 180px;
    padding: 10px;
  }
}

@media (max-width: 768px) {
  .app-shell__aside {
    display: none;
  }

  .app-shell__main {
    padding: 12px;
  }
}
</style>
