<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/system/user', label: 'System User' },
  { path: '/system/role', label: 'System Role' },
]

const activePath = computed(() => route.path)

async function handleNavigate(path: string): Promise<void> {
  if (route.path === path) {
    return
  }

  try {
    await router.push(path)
  } catch (error) {
    // Keep this visible in console for routing diagnosis.
    console.error('Route navigation failed:', error)
  }
}

function handleLogout(): void {
  authStore.logout()
}
</script>

<template>
  <div class="app-layout">
    <aside class="app-layout__aside">
      <div class="app-layout__brand">Agri System</div>
      <nav class="app-layout__nav">
        <button
          v-for="item in navigationItems"
          :key="item.path"
          type="button"
          class="nav-item"
          :class="{ 'nav-item--active': activePath === item.path }"
          @click="handleNavigate(item.path)"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <div class="app-layout__body">
      <header class="app-layout__header">
        <span class="header-user">{{ authStore.user?.realName || authStore.user?.username || 'User' }}</span>
        <el-button type="danger" plain size="small" @click="handleLogout">Logout</el-button>
      </header>

      <main class="app-layout__main">
        <router-view :key="route.fullPath" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background: #f3f4f6;
}

.app-layout__aside {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #1a2e1a;
  color: #fff;
}

.app-layout__brand {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-weight: 700;
  font-size: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: 0.5px;
}

.app-layout__nav {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.nav-item {
  border: 0;
  background: transparent;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item--active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-right: 3px solid #4ade80;
}

.app-layout__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-layout__header {
  height: 56px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.header-user {
  font-size: 14px;
  color: #555;
}

.app-layout__main {
  flex: 1;
  overflow: auto;
}
</style>
