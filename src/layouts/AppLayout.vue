<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activePath = computed(() => route.path)

function handleLogout(): void {
  authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <el-container class="app-layout">
    <el-aside width="220px" class="app-layout__aside">
      <div class="app-layout__brand">Agri System</div>

      <el-menu :default-active="activePath" router>
        <el-menu-item index="/dashboard">Dashboard</el-menu-item>
        <el-menu-item index="/system/user">System User</el-menu-item>
        <el-menu-item index="/system/role">System Role</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-layout__header">
        <span>{{ authStore.user?.realName || authStore.user?.username || 'User' }}</span>
        <el-button type="danger" plain @click="handleLogout">Logout</el-button>
      </el-header>

      <el-main class="app-layout__main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-layout__aside {
  border-right: 1px solid #e5e7eb;
  background: #f8fafc;
}

.app-layout__brand {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
}

.app-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.app-layout__main {
  background: #f3f4f6;
}
</style>
