<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { MENU_ACCESS, type AppRole } from '@/constants/permission'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'
import { useAuthStore } from '@/stores/auth'

interface NavItem {
  path: string
  label: string
  roles: AppRole[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navigationItems: NavItem[] = [
  { path: '/dashboard', label: '工作台 (Dashboard)', roles: MENU_ACCESS.dashboard },
  { path: '/system/user', label: '用户管理', roles: MENU_ACCESS.system },
  { path: '/system/role', label: '角色管理', roles: MENU_ACCESS.system },
  { path: '/task/list', label: '任务派单', roles: MENU_ACCESS.taskManage },
  { path: '/task/my', label: '我的任务', roles: MENU_ACCESS.myTask },
  { path: '/task/log', label: '执行日志', roles: MENU_ACCESS.taskLog },
  { path: '/crop/variety', label: '作物品种', roles: MENU_ACCESS.crop },
  { path: '/crop/batch', label: '种植批次', roles: MENU_ACCESS.crop },
  { path: '/crop/growth-log/1', label: '生长日志', roles: MENU_ACCESS.crop },
  { path: '/material/inventory', label: '物资库存', roles: MENU_ACCESS.materialInventory },
  { path: '/material/log', label: '出入库登记', roles: MENU_ACCESS.materialLog },
  { path: '/iot/monitor', label: '设备监测', roles: MENU_ACCESS.iotMonitor },
  { path: '/iot/rule', label: '预警规则', roles: MENU_ACCESS.iotRule },
  { path: '/report/analytics', label: '统计报表', roles: MENU_ACCESS.report },
]

const currentRoles = computed(() => resolveUserRoles(authStore.roles, authStore.user))

const visibleNavigationItems = computed(() => {
  return navigationItems.filter((item) => hasAnyRole(currentRoles.value, item.roles))
})

const activePath = computed(() => {
  if (route.path.startsWith('/crop/growth-log/')) {
    return '/crop/growth-log/1'
  }
  return route.path
})

async function handleNavigate(path: string): Promise<void> {
  if (route.path === path) {
    return
  }

  try {
    await router.push(path)
  } catch (error) {
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
          v-for="item in visibleNavigationItems"
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
