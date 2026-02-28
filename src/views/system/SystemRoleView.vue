<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { listSystemRole } from '@/api/modules/system'
import type { SysRole } from '@/api/types/models'

const loading = ref(false)
const data = ref<SysRole[]>([])

async function loadRoles(): Promise<void> {
  loading.value = true
  try {
    const res = await listSystemRole({ pageNum: 1, pageSize: 20 })
    data.value = res.records ?? []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRoles()
})
</script>

<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>System Role</span>
        <el-button type="primary" plain @click="loadRoles">Refresh</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="data" border stripe>
      <el-table-column prop="roleId" label="Role ID" width="100" />
      <el-table-column prop="roleName" label="Role Name" min-width="180" />
      <el-table-column prop="roleKey" label="Role Key" min-width="180" />
      <el-table-column prop="createTime" label="Create Time" min-width="180" />
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
