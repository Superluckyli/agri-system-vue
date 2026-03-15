<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { MENU_ACCESS, type AppRole } from '@/constants/permission'
import { hasAnyRole, resolveUserRoles } from '@/utils/permission'
import { useAuthStore } from '@/stores/auth'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import TagsView from '@/components/layout/TagsView.vue'

interface NavItem {
  path: string
  label: string
  roles: AppRole[]
}

interface NavGroup {
  label: string
  children: NavItem[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navigationGroups: NavGroup[] = [
  {
    label: '工作台',
    children: [
      { path: '/dashboard', label: 'Dashboard', roles: MENU_ACCESS.dashboard },
    ],
  },
  {
    label: '系统管理',
    children: [
      { path: '/system/user', label: '用户管理', roles: MENU_ACCESS.system },
      { path: '/system/role', label: '角色管理', roles: MENU_ACCESS.system },
    ],
  },
  {
    label: '任务管理',
    children: [
      { path: '/task/list', label: '任务派单', roles: MENU_ACCESS.taskManage },
      { path: '/task/my', label: '我的任务', roles: MENU_ACCESS.myTask },
      { path: '/task/log', label: '执行日志', roles: MENU_ACCESS.taskLog },
    ],
  },
  {
    label: '种植管理',
    children: [
      { path: '/crop/variety', label: '作物品种', roles: MENU_ACCESS.crop },
      { path: '/crop/batch', label: '种植批次', roles: MENU_ACCESS.crop },
      { path: '/crop/farmland', label: '农田管理', roles: MENU_ACCESS.farmland },
    ],
  },
  {
    label: '物资采购',
    children: [
      { path: '/material/inventory', label: '物资库存', roles: MENU_ACCESS.materialInventory },
      { path: '/material/log', label: '出入库登记', roles: MENU_ACCESS.materialLog },
      { path: '/supplier', label: '供应商管理', roles: MENU_ACCESS.supplier },
      { path: '/purchase', label: '采购管理', roles: MENU_ACCESS.purchase },
    ],
  },
  {
    label: 'IoT 监测',
    children: [
      { path: '/iot/monitor', label: '设备监测', roles: MENU_ACCESS.iotMonitor },
      { path: '/iot/rule', label: '预警规则', roles: MENU_ACCESS.iotRule },
    ],
  },
  {
    label: '统计报表',
    children: [
      { path: '/report/analytics', label: '分析报表', roles: MENU_ACCESS.report },
    ],
  },
]

const currentRoles = computed(() => resolveUserRoles(authStore.roles, authStore.user))

const visibleGroups = computed(() => {
  return navigationGroups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => hasAnyRole(currentRoles.value, item.roles)),
    }))
    .filter((group) => group.children.length > 0)
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
      <el-menu
        :default-active="route.path"
        background-color="#1a2e1a"
        text-color="rgba(255, 255, 255, 0.75)"
        active-text-color="#4ade80"
        :unique-opened="true"
        class="sidebar-menu"
        @select="handleNavigate"
      >
        <el-sub-menu v-for="group in visibleGroups" :key="group.label" :index="group.label">
          <template #title>{{ group.label }}</template>
          <el-menu-item
            v-for="item in group.children"
            :key="item.path"
            :index="item.path"
          >
            {{ item.label }}
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <div class="app-layout__body">
      <header class="app-layout__header">
        <AppBreadcrumb />
        <div style="flex: 1" />
        <router-link to="/profile" class="header-profile-link">个人中心</router-link>
        <span class="header-user">{{ authStore.user?.realName || authStore.user?.username || 'User' }}</span>
        <el-button type="danger" plain size="small" @click="handleLogout">Logout</el-button>
      </header>

      <TagsView />

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

.sidebar-menu {
  border-right: none;
  overflow-y: auto;
  flex: 1;
}

.sidebar-menu :deep(.el-sub-menu__title) {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5) !important;
  letter-spacing: 0.3px;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.06) !important;
}

.sidebar-menu :deep(.el-menu-item) {
  font-size: 14px;
  height: 42px;
  line-height: 42px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: rgba(255, 255, 255, 0.15) !important;
  border-right: 3px solid #4ade80;
}

.sidebar-menu :deep(.el-menu--inline) {
  background-color: rgba(0, 0, 0, 0.15) !important;
}

.sidebar-menu :deep(.el-sub-menu__icon-arrow) {
  color: rgba(255, 255, 255, 0.4);
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

.header-profile-link {
  font-size: 14px;
  color: #409eff;
  text-decoration: none;
}

.header-profile-link:hover {
  text-decoration: underline;
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
