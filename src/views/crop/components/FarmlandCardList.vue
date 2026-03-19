<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { FARMLAND_STATUS_MAP } from '@/constants/task'
import type { AgriFarmland } from '@/types/entity'

const props = defineProps<{
  farmlands: AgriFarmland[]
  selectedId: number | null
  loading: boolean
  userMap: Map<number, string>
}>()

const emit = defineEmits<{
  select: [id: number]
  add: []
  edit: [farmland: AgriFarmland]
  delete: [farmland: AgriFarmland]
}>()

const searchText = ref('')

const filteredFarmlands = computed(() => {
  if (!searchText.value.trim()) return props.farmlands
  const keyword = searchText.value.trim().toLowerCase()
  return props.farmlands.filter(
    (f) =>
      (f.name && f.name.toLowerCase().includes(keyword)) ||
      (f.code && f.code.toLowerCase().includes(keyword)),
  )
})

const getManagerName = (userId?: number) => {
  if (!userId) return '-'
  return props.userMap.get(userId) || `用户${userId}`
}
</script>

<template>
  <div class="farmland-card-list">
    <div class="panel-header">
      <span class="panel-title">农田空间列表</span>
      <el-button type="primary" :icon="Plus" size="small" circle @click="emit('add')" />
    </div>

    <el-input
      v-model="searchText"
      placeholder="搜索农田..."
      clearable
      size="small"
      class="search-input"
    />

    <div v-loading="loading" class="card-scroll">
      <div
        v-for="item in filteredFarmlands"
        :key="item.id"
        class="farmland-card"
        :class="{ 'is-selected': item.id === selectedId }"
        @click="item.id && emit('select', item.id)"
      >
        <div class="card-top">
          <span class="card-name">{{ item.name || '未命名' }}</span>
          <el-tag
            v-if="item.status != null && FARMLAND_STATUS_MAP[item.status]"
            :type="FARMLAND_STATUS_MAP[item.status]?.type"
            size="small"
          >
            {{ FARMLAND_STATUS_MAP[item.status]?.text }}
          </el-tag>
        </div>
        <div class="card-info">
          <span>面积: {{ item.area ?? '-' }} 亩</span>
          <span>负责人: {{ getManagerName(item.managerUserId) }}</span>
        </div>
        <div v-if="item.location" class="card-info">
          <span>位置: {{ item.location }}</span>
        </div>
        <div class="card-actions">
          <el-button
            :icon="Edit"
            size="small"
            link
            type="primary"
            @click.stop="emit('edit', item)"
          >编辑</el-button>
          <el-button
            :icon="Delete"
            size="small"
            link
            type="danger"
            @click.stop="emit('delete', item)"
          >删除</el-button>
        </div>
      </div>

      <el-empty v-if="!loading && filteredFarmlands.length === 0" description="暂无农田数据" :image-size="80" />
    </div>
  </div>
</template>

<style scoped>
.farmland-card-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.search-input {
  margin-bottom: 12px;
}

.card-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.farmland-card {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  border-left: 3px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.farmland-card:hover {
  border-left-color: #b3e19d;
  background: #fafff7;
}

.farmland-card.is-selected {
  border-left-color: #67c23a;
  background: #f0f9eb;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.card-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.card-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  justify-content: flex-end;
}
</style>
