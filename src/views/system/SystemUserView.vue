<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { listSystemUser } from '@/api/modules/system'
import type { SysUser } from '@/api/types/models'

const loading = ref(false)
const data = ref<SysUser[]>([])

async function loadUsers(): Promise<void> {
  loading.value = true
  try {
    const res = await listSystemUser({ pageNum: 1, pageSize: 20 })
    data.value = res.records ?? []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>System User</span>
        <el-button type="primary" plain @click="loadUsers">Refresh</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="data" border stripe>
      <el-table-column prop="userId" label="User ID" width="100" />
      <el-table-column prop="username" label="Username" min-width="160" />
      <el-table-column prop="realName" label="Real Name" min-width="160" />
      <el-table-column prop="phone" label="Phone" min-width="150" />
      <el-table-column prop="status" label="Status" width="100" />
    </el-table>
  </el-card>
</template>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
